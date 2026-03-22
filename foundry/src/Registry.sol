// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Registry
/// @notice Stores CTF outcomes as flat mappings (no public structs). Time rules: 72h minimum before punishment
///         paths; 94h (48h CTF + 46h judging / “all judging”) before `resolve`; within 7d `punishOffer`
///         window; after 7d anyone may `publicPunish`.
contract Registry is Ownable, ReentrancyGuard {
    IERC721 public sponsorNFT;
    /// @notice Optional triage credential collection (see `TriageNFT`) for integrations / frontends.
    IERC721 public triageNFT;
    /// @notice Optional `CompetitorNFT` — when set, payees / participants must hold a token (World ID verified at mint).
    IERC721 public competitorNFT;

    /// @dev Mirrors `OutcomeKind` for `getOutcome` first return value.
    uint8 public constant KIND_UNDEFINED = 0;
    uint8 public constant KIND_SINGLE = 1;
    uint8 public constant KIND_MULTIPLE = 2;
    uint8 public constant KIND_JOB = 3;
    uint8 public constant KIND_HACKATHON = 4;
    uint8 public constant KIND_HACKATHON_SINGLE = 5;
    uint8 public constant KIND_SINGLE_TO_MULTIPLE = 6;

    uint256 internal constant HOURS_72 = 72 hours;
    uint256 internal constant HOURS_94 = 94 hours;
    uint256 internal constant ONE_WEEK = 7 days;

    uint256 public constant PUNISH_PARTICIPANT_BPS = 1000; // 10%

    /// @notice Pitch.md — healthy path with triage: 85% competitors / 10% judges / 4% triage / 1% treasury.
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant BPS_COMPETITORS_WITH_TRIAGE = 8500;
    uint256 public constant BPS_JUDGES_WITH_TRIAGE = 1000;
    uint256 public constant BPS_TRIAGE_WITH_TRIAGE = 400;
    uint256 public constant BPS_TREASURY_WITH_TRIAGE = 100;

    /// @notice Pitch.md — no triage (judges present): 85% / 14% / 1%.
    uint256 public constant BPS_COMPETITORS_NO_TRIAGE = 8500;
    uint256 public constant BPS_JUDGES_NO_TRIAGE = 1400;
    uint256 public constant BPS_TREASURY_NO_TRIAGE = 100;

    /// @notice Receives protocol fee slice (1% in both pitch paths).
    address payable public protocolTreasury;

    /// @notice Per-CTF triage payout address when `ctfSupportsTriage` — required for the 4% triage leg.
    mapping(uint256 => address payable) public triageRecipient;

    /// @notice Winner payout addresses by index (aligned with `getOutcome` winner hackers order).
    mapping(uint256 => mapping(uint256 => address payable)) private _competitorPayee;

    /// @dev After `resolve*`, call `distributeRewards` once to move `ctfStakedWei` per Pitch.md.
    mapping(uint256 => bool) public rewardsDistributed;

    mapping(address => bool) public isResponsible;

    mapping(uint256 => uint256) public ctfCreationTime;
    mapping(uint256 => bool) public ctfSupportsTriage;
    mapping(uint256 => bool) public ctfFinished;
    mapping(uint256 => bool) public ctfResolved;
    mapping(uint256 => bool) public sponsorMarkedUnresponsive;

    mapping(uint256 => uint256) public ctfStakedWei;

    mapping(uint256 => uint8) public outcomeKind;

    mapping(uint256 => bytes32) public singleWinnerHacker;
    mapping(uint256 => address) public singleWinnerJudge;

    mapping(uint256 => bytes32[]) private _multipleWinnerHackers;
    mapping(uint256 => address[]) private _multipleWinnerJudges;

    mapping(uint256 => address) public jobWinnerHacker;
    mapping(uint256 => address) public jobWinnerJudge;

    mapping(uint256 => bytes32[]) private _hackathonWinners;
    mapping(uint256 => bytes32) public hackathonSingleWinner;
    mapping(uint256 => bytes32) public singleToMultipleWinnerHacker;
    mapping(uint256 => address[]) private _singleToMultipleJudges;

    mapping(uint256 => address[]) private _participants;
    mapping(uint256 => address) public ctfSponsor;

    error Unauthorized();
    error TooEarlyForPunish();
    error TooEarlyToResolve();
    error CtfNotFinished();
    error AlreadyResolved();
    error NotUnresponsive();
    error OfferWindowEnded();
    error WeekNotOverYet();
    error BadOutcomeKind();
    error ZeroAddress();
    error TransferFailed();
    error CtfAlreadyExists();
    error CtfUnknown();
    error NotResolved();
    error AlreadyDistributed();
    error TreasuryNotSet();
    error TriageRecipientNotSet();
    error MissingCompetitorPayee();
    error PayeeIndexOutOfRange();
    error MissingCompetitorCredential();

    event SponsorNFTUpdated(address indexed nft);
    event TriageNFTUpdated(address indexed nft);
    event CompetitorNFTUpdated(address indexed nft);
    event ResponsibleSet(address indexed account, bool responsible);
    event CtfCreated(uint256 indexed ctfId, uint256 creationTime, bool supportsTriage, address sponsor);
    event StakeDeposited(uint256 indexed ctfId, uint256 amount);
    event Resolved(uint256 indexed ctfId, uint8 kind, address indexed caller);
    event SponsorUnresponsive(uint256 indexed ctfId);
    event PunishmentExecuted(uint256 indexed ctfId, uint256 toParticipants, uint256 toSponsor, bool indexed publicCall);
    event ProtocolTreasuryUpdated(address indexed treasury);
    event TriageRecipientUpdated(uint256 indexed ctfId, address indexed recipient);
    event CompetitorPayeeSet(uint256 indexed ctfId, uint256 indexed index, address indexed payee);
    event RewardsDistributed(
        uint256 indexed ctfId,
        uint256 stake,
        uint256 competitorTotal,
        uint256 judgeTotal,
        uint256 triageTotal,
        uint256 treasuryTotal
    );

    constructor(address sponsorNft_) Ownable(msg.sender) {
        if (sponsorNft_ == address(0)) revert ZeroAddress();
        sponsorNFT = IERC721(sponsorNft_);
    }

    function setSponsorNFT(address nft) external onlyOwner {
        if (nft == address(0)) revert ZeroAddress();
        sponsorNFT = IERC721(nft);
        emit SponsorNFTUpdated(nft);
    }

    function setTriageNFT(address nft) external onlyOwner {
        if (nft == address(0)) revert ZeroAddress();
        triageNFT = IERC721(nft);
        emit TriageNFTUpdated(nft);
    }

    /// @notice When set (non-zero), `setCompetitorPayee`, `registerParticipant`, and `resolveJob` require the address to hold a Competitor NFT.
    /// @dev Pass `address(0)` to disable enforcement (legacy / testing).
    function setCompetitorNFT(address nft) external onlyOwner {
        competitorNFT = IERC721(nft);
        emit CompetitorNFTUpdated(nft);
    }

    function setProtocolTreasury(address payable treasury) external onlyOwner {
        if (treasury == address(0)) revert ZeroAddress();
        protocolTreasury = treasury;
        emit ProtocolTreasuryUpdated(treasury);
    }

    /// @notice Triage wallet for the 4% leg (Pitch.md). Required when `ctfSupportsTriage` and using triage BPS path.
    function setTriageRecipient(uint256 ctfId, address payable recipient) external {
        if (msg.sender != owner() && !isResponsible[msg.sender]) revert Unauthorized();
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        triageRecipient[ctfId] = recipient;
        emit TriageRecipientUpdated(ctfId, recipient);
    }

    /// @notice Register payout `address` for competitor/winner at `index` (same order as outcome hackers array).
    function setCompetitorPayee(uint256 ctfId, uint256 index, address payable payee) external {
        if (msg.sender != owner() && !isResponsible[msg.sender]) revert Unauthorized();
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (payee == address(0)) revert ZeroAddress();
        _requireCompetitorIfConfigured(payee);
        _competitorPayee[ctfId][index] = payee;
        emit CompetitorPayeeSet(ctfId, index, payee);
    }

    function getCompetitorPayee(uint256 ctfId, uint256 index) external view returns (address payable) {
        return _competitorPayee[ctfId][index];
    }

    /// @notice Whether `account` holds a triage credential (if `triageNFT` is configured).
    function hasTriageCredential(address account) external view returns (bool) {
        return address(triageNFT) != address(0) && triageNFT.balanceOf(account) > 0;
    }

    /// @notice Whether `account` holds a competitor credential (if `competitorNFT` is configured).
    function hasCompetitorCredential(address account) external view returns (bool) {
        return address(competitorNFT) != address(0) && competitorNFT.balanceOf(account) > 0;
    }

    function _requireCompetitorIfConfigured(address account) internal view {
        if (address(competitorNFT) == address(0)) return;
        if (competitorNFT.balanceOf(account) == 0) revert MissingCompetitorCredential();
    }

    /// @notice Protocol team: mark who is responsible for triage / non-triage flows.
    function setResponsible(address account, bool responsible) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isResponsible[account] = responsible;
        emit ResponsibleSet(account, responsible);
    }

    function _canResolve(address caller) internal view returns (bool) {
        return caller == owner() || sponsorNFT.balanceOf(caller) > 0;
    }

    /// @notice Returns outcome data without a Solidity `struct` — use `kind` to interpret arrays.
    function getOutcome(uint256 ctfId)
        external
        view
        returns (
            uint8 kind,
            bytes32[] memory winnerHackers,
            address[] memory winnerJudges,
            address jobWinner,
            address jobJudge
        )
    {
        kind = outcomeKind[ctfId];
        if (kind == KIND_SINGLE) {
            winnerHackers = new bytes32[](1);
            winnerHackers[0] = singleWinnerHacker[ctfId];
            winnerJudges = _singleJudgeArray(singleWinnerJudge[ctfId]);
        } else if (kind == KIND_SINGLE_TO_MULTIPLE) {
            winnerHackers = new bytes32[](1);
            winnerHackers[0] = singleToMultipleWinnerHacker[ctfId];
            winnerJudges = _singleToMultipleJudges[ctfId];
        } else if (kind == KIND_MULTIPLE) {
            winnerHackers = _multipleWinnerHackers[ctfId];
            winnerJudges = _multipleWinnerJudges[ctfId];
        } else if (kind == KIND_HACKATHON) {
            winnerHackers = _hackathonWinners[ctfId];
            winnerJudges = new address[](0);
        } else if (kind == KIND_JOB) {
            jobWinner = jobWinnerHacker[ctfId];
            jobJudge = jobWinnerJudge[ctfId];
        } else if (kind == KIND_HACKATHON_SINGLE) {
            winnerHackers = new bytes32[](1);
            winnerHackers[0] = hackathonSingleWinner[ctfId];
        }
    }

    function _singleJudgeArray(address j) private pure returns (address[] memory a) {
        a = new address[](1);
        a[0] = j;
    }

    /// @dev `ctfFinished` must be true (set off-chain or by admin flow). `resolve` only after 94h from creation.
    function resolveSingle(uint256 ctfId, bytes32 winnerHacker, address winnerJudge) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        outcomeKind[ctfId] = KIND_SINGLE;
        singleWinnerHacker[ctfId] = winnerHacker;
        singleWinnerJudge[ctfId] = winnerJudge;
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_SINGLE, msg.sender);
    }

    function resolveMultiple(uint256 ctfId, bytes32[] calldata hackers, address[] calldata judges) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        outcomeKind[ctfId] = KIND_MULTIPLE;
        delete _multipleWinnerHackers[ctfId];
        delete _multipleWinnerJudges[ctfId];
        for (uint256 i; i < hackers.length; ++i) {
            _multipleWinnerHackers[ctfId].push(hackers[i]);
        }
        for (uint256 i; i < judges.length; ++i) {
            _multipleWinnerJudges[ctfId].push(judges[i]);
        }
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_MULTIPLE, msg.sender);
    }

    function resolveJob(uint256 ctfId, address winnerHacker, address winnerJudge) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        _requireCompetitorIfConfigured(winnerHacker);
        outcomeKind[ctfId] = KIND_JOB;
        jobWinnerHacker[ctfId] = winnerHacker;
        jobWinnerJudge[ctfId] = winnerJudge;
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_JOB, msg.sender);
    }

    function resolveHackathon(uint256 ctfId, bytes32[] calldata hackers) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        outcomeKind[ctfId] = KIND_HACKATHON;
        delete _hackathonWinners[ctfId];
        for (uint256 i; i < hackers.length; ++i) {
            _hackathonWinners[ctfId].push(hackers[i]);
        }
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_HACKATHON, msg.sender);
    }

    function resolveHackathonSingle(uint256 ctfId, bytes32 winnerHacker) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        outcomeKind[ctfId] = KIND_HACKATHON_SINGLE;
        hackathonSingleWinner[ctfId] = winnerHacker;
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_HACKATHON_SINGLE, msg.sender);
    }

    function resolveSingleToMultiple(uint256 ctfId, bytes32 winnerHacker, address[] calldata judges) external {
        _resolveAuth(ctfId);
        _requireOutcomeWindow(ctfId);
        outcomeKind[ctfId] = KIND_SINGLE_TO_MULTIPLE;
        singleToMultipleWinnerHacker[ctfId] = winnerHacker;
        delete _singleToMultipleJudges[ctfId];
        for (uint256 i; i < judges.length; ++i) {
            _singleToMultipleJudges[ctfId].push(judges[i]);
        }
        ctfResolved[ctfId] = true;
        emit Resolved(ctfId, KIND_SINGLE_TO_MULTIPLE, msg.sender);
    }

    function _resolveAuth(uint256 ctfId) internal view {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (!_canResolve(msg.sender)) revert Unauthorized();
        if (!ctfFinished[ctfId]) revert CtfNotFinished();
        if (ctfResolved[ctfId]) revert AlreadyResolved();
    }

    /// @notice 94h after creation: CTF (48h) + judging window (46h) as specified.
    function _requireOutcomeWindow(uint256 ctfId) internal view {
        if (block.timestamp < ctfCreationTime[ctfId] + HOURS_94) revert TooEarlyToResolve();
    }

    /// @notice Mark CTF ended (submissions closed) — e.g. automation or owner.
    function markCtfFinished(uint256 ctfId) external onlyOwner {
        ctfFinished[ctfId] = true;
    }

    /// @notice Register participant for pro-rata punishment share (append once).
    function registerParticipant(uint256 ctfId, address participant) external {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (participant == address(0)) revert ZeroAddress();
        if (msg.sender != owner() && !isResponsible[msg.sender]) revert Unauthorized();
        _requireCompetitorIfConfigured(participant);
        _participants[ctfId].push(participant);
    }

    /// @notice Owner bootstraps a CTF id with time anchor and sponsor.
    function createCtf(uint256 ctfId, bool supportsTriage, address sponsor) external onlyOwner {
        _createCtf(ctfId, supportsTriage, sponsor);
    }

    /// @notice Called only by the `SponsorNFT` contract when a sponsor onboards with stake + collateral.
    function createCtfFromSponsor(uint256 ctfId, bool supportsTriage, address sponsor) external {
        if (msg.sender != address(sponsorNFT)) revert Unauthorized();
        _createCtf(ctfId, supportsTriage, sponsor);
    }

    function _createCtf(uint256 ctfId, bool supportsTriage, address sponsor) internal {
        if (sponsor == address(0)) revert ZeroAddress();
        if (ctfCreationTime[ctfId] != 0) revert CtfAlreadyExists();
        ctfCreationTime[ctfId] = block.timestamp;
        ctfSupportsTriage[ctfId] = supportsTriage;
        ctfSponsor[ctfId] = sponsor;
        emit CtfCreated(ctfId, block.timestamp, supportsTriage, sponsor);
    }

    function depositStakeEth(uint256 ctfId) external payable {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        ctfStakedWei[ctfId] += msg.value;
        emit StakeDeposited(ctfId, msg.value);
    }

    function markSponsorUnresponsive(uint256 ctfId) external {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (!isResponsible[msg.sender] && msg.sender != owner()) revert Unauthorized();
        sponsorMarkedUnresponsive[ctfId] = true;
        emit SponsorUnresponsive(ctfId);
    }

    /// @notice After resolution, split `ctfStakedWei` per Pitch.md (competitors / judges / triage / treasury).
    /// @dev Call once per CTF. Competitor payees must be set via `setCompetitorPayee` for indexed outcomes;
    ///      `KIND_JOB` pays `jobWinnerHacker` / `jobWinnerJudge` directly. Requires `protocolTreasury`.
    function distributeRewards(uint256 ctfId) external nonReentrant {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (!ctfResolved[ctfId]) revert NotResolved();
        if (rewardsDistributed[ctfId]) revert AlreadyDistributed();
        if (protocolTreasury == address(0)) revert TreasuryNotSet();
        if (msg.sender != owner() && !isResponsible[msg.sender]) revert Unauthorized();

        uint256 stake = ctfStakedWei[ctfId];
        if (stake == 0) {
            rewardsDistributed[ctfId] = true;
            return;
        }

        (uint256 compBps, uint256 judgeBps, uint256 triageBps) = _bpsSplit(ctfId);
        uint256 compTotal = (stake * compBps) / BPS_DENOMINATOR;
        uint256 judgeTotal = (stake * judgeBps) / BPS_DENOMINATOR;
        uint256 triageTotal = (stake * triageBps) / BPS_DENOMINATOR;
        uint256 treasuryTotal = stake - compTotal - judgeTotal - triageTotal;

        uint8 kind = outcomeKind[ctfId];

        if (kind == KIND_SINGLE) {
            _distributeSingle(ctfId, compTotal, judgeTotal, triageTotal, treasuryTotal);
        } else if (kind == KIND_MULTIPLE || kind == KIND_SINGLE_TO_MULTIPLE) {
            _distributeMultipleLike(ctfId, kind, compTotal, judgeTotal, triageTotal, treasuryTotal);
        } else if (kind == KIND_JOB) {
            _distributeJob(ctfId, compTotal, judgeTotal, treasuryTotal);
        } else if (kind == KIND_HACKATHON || kind == KIND_HACKATHON_SINGLE) {
            _distributeHackathonLike(ctfId, kind, compTotal, judgeTotal, triageTotal, treasuryTotal);
        } else {
            revert BadOutcomeKind();
        }

        ctfStakedWei[ctfId] = 0;
        rewardsDistributed[ctfId] = true;
        emit RewardsDistributed(ctfId, stake, compTotal, judgeTotal, triageTotal, treasuryTotal);
    }

    /// @dev Treasury share is the remainder after floor division so amounts sum to `stake`.
    function _bpsSplit(uint256 ctfId)
        internal
        view
        returns (uint256 compBps, uint256 judgeBps, uint256 triageBps)
    {
        uint8 k = outcomeKind[ctfId];
        if (k == KIND_JOB) {
            return (BPS_COMPETITORS_NO_TRIAGE, BPS_JUDGES_NO_TRIAGE, 0);
        }
        if (ctfSupportsTriage[ctfId]) {
            if (triageRecipient[ctfId] == address(0)) revert TriageRecipientNotSet();
            return (BPS_COMPETITORS_WITH_TRIAGE, BPS_JUDGES_WITH_TRIAGE, BPS_TRIAGE_WITH_TRIAGE);
        }
        return (BPS_COMPETITORS_NO_TRIAGE, BPS_JUDGES_NO_TRIAGE, 0);
    }

    function _sendValue(address payable to, uint256 amount) internal {
        if (amount == 0 || to == address(0)) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _distributeSingle(
        uint256 ctfId,
        uint256 compTotal,
        uint256 judgeTotal,
        uint256 triageTotal,
        uint256 treasuryTotal
    ) internal {
        address payable payee = _competitorPayee[ctfId][0];
        if (payee == address(0)) revert MissingCompetitorPayee();
        _sendValue(payee, compTotal);

        address j = singleWinnerJudge[ctfId];
        if (j == address(0)) {
            treasuryTotal += judgeTotal;
        } else {
            _sendValue(payable(j), judgeTotal);
        }

        _sendValue(triageRecipient[ctfId], triageTotal);
        _sendValue(protocolTreasury, treasuryTotal);
    }

    function _distributeMultipleLike(
        uint256 ctfId,
        uint8 kind,
        uint256 compTotal,
        uint256 judgeTotal,
        uint256 triageTotal,
        uint256 treasuryTotal
    ) internal {
        if (kind == KIND_SINGLE_TO_MULTIPLE) {
            address payable p = _competitorPayee[ctfId][0];
            if (p == address(0)) revert MissingCompetitorPayee();
            _sendValue(p, compTotal);
            address[] storage judgesStm = _singleToMultipleJudges[ctfId];
            uint256 nj = judgesStm.length;
            if (nj == 0) {
                treasuryTotal += judgeTotal;
            } else {
                uint256 eachJ = judgeTotal / nj;
                uint256 remJ = judgeTotal - eachJ * nj;
                for (uint256 i; i < nj; ++i) {
                    _sendValue(payable(judgesStm[i]), eachJ + (i == 0 ? remJ : 0));
                }
            }
            _sendValue(triageRecipient[ctfId], triageTotal);
            _sendValue(protocolTreasury, treasuryTotal);
            return;
        }

        bytes32[] storage hackers = _multipleWinnerHackers[ctfId];
        uint256 nh = hackers.length;
        if (nh == 0) revert MissingCompetitorPayee();
        uint256 eachC = compTotal / nh;
        uint256 remC = compTotal - eachC * nh;
        for (uint256 i; i < nh; ++i) {
            address payable cp = _competitorPayee[ctfId][i];
            if (cp == address(0)) revert MissingCompetitorPayee();
            _sendValue(cp, eachC + (i == 0 ? remC : 0));
        }

        address[] storage judgesMul = _multipleWinnerJudges[ctfId];
        uint256 njM = judgesMul.length;
        if (njM == 0) {
            treasuryTotal += judgeTotal;
        } else {
            uint256 eachJm = judgeTotal / njM;
            uint256 remJm = judgeTotal - eachJm * njM;
            for (uint256 i; i < njM; ++i) {
                _sendValue(payable(judgesMul[i]), eachJm + (i == 0 ? remJm : 0));
            }
        }

        _sendValue(triageRecipient[ctfId], triageTotal);
        _sendValue(protocolTreasury, treasuryTotal);
    }

    function _distributeJob(uint256 ctfId, uint256 compTotal, uint256 judgeTotal, uint256 treasuryTotal) internal {
        if (jobWinnerHacker[ctfId] == address(0)) revert MissingCompetitorPayee();
        _sendValue(payable(jobWinnerHacker[ctfId]), compTotal);
        address jj = jobWinnerJudge[ctfId];
        if (jj == address(0)) {
            treasuryTotal += judgeTotal;
        } else {
            _sendValue(payable(jj), judgeTotal);
        }
        _sendValue(protocolTreasury, treasuryTotal);
    }

    function _distributeHackathonLike(
        uint256 ctfId,
        uint8 kind,
        uint256 compTotal,
        uint256 judgeTotal,
        uint256 triageTotal,
        uint256 treasuryTotal
    ) internal {
        if (kind == KIND_HACKATHON_SINGLE) {
            address payable p = _competitorPayee[ctfId][0];
            if (p == address(0)) revert MissingCompetitorPayee();
            _sendValue(p, compTotal);
        } else {
            bytes32[] storage hackers = _hackathonWinners[ctfId];
            uint256 nh = hackers.length;
            if (nh == 0) revert MissingCompetitorPayee();
            uint256 eachC = compTotal / nh;
            uint256 remC = compTotal - eachC * nh;
            for (uint256 i; i < nh; ++i) {
                address payable cp = _competitorPayee[ctfId][i];
                if (cp == address(0)) revert MissingCompetitorPayee();
                _sendValue(cp, eachC + (i == 0 ? remC : 0));
            }
        }
        // No platform judges on hackathon outcome — judge slice to treasury (Pitch: pool still allocates judge leg).
        treasuryTotal += judgeTotal;
        _sendValue(triageRecipient[ctfId], triageTotal);
        _sendValue(protocolTreasury, treasuryTotal);
    }

    /// @notice While `now <= creation + 7d` and `now >= creation + 72h`: restricted punishment split.
    function punishOffer(uint256 ctfId) external nonReentrant {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (block.timestamp < ctfCreationTime[ctfId] + HOURS_72) revert TooEarlyForPunish();
        if (block.timestamp > ctfCreationTime[ctfId] + ONE_WEEK) revert OfferWindowEnded();
        if (!sponsorMarkedUnresponsive[ctfId]) revert NotUnresponsive();
        if (msg.sender != owner() && sponsorNFT.balanceOf(msg.sender) == 0) revert Unauthorized();
        _executePunishment(ctfId, false);
    }

    /// @notice After `creation + 7d` and `>= 72h`: anyone may punish unresponsive sponsor.
    function publicPunish(uint256 ctfId) external nonReentrant {
        if (ctfCreationTime[ctfId] == 0) revert CtfUnknown();
        if (block.timestamp < ctfCreationTime[ctfId] + HOURS_72) revert TooEarlyForPunish();
        if (block.timestamp <= ctfCreationTime[ctfId] + ONE_WEEK) revert WeekNotOverYet();
        if (!sponsorMarkedUnresponsive[ctfId]) revert NotUnresponsive();
        _executePunishment(ctfId, true);
    }

    function _executePunishment(uint256 ctfId, bool publicCall) internal {
        uint256 stake = ctfStakedWei[ctfId];
        if (stake == 0) return;

        uint256 toParticipants = (stake * PUNISH_PARTICIPANT_BPS) / 10_000;
        uint256 toSponsor = stake - toParticipants;

        address sponsor = ctfSponsor[ctfId];
        address[] storage parts = _participants[ctfId];
        uint256 n = parts.length;

        if (n > 0 && toParticipants > 0) {
            uint256 each = toParticipants / n;
            uint256 remainder = toParticipants - each * n;
            for (uint256 i; i < n; ++i) {
                uint256 pay = each + (i == 0 ? remainder : 0);
                (bool ok,) = parts[i].call{value: pay}("");
                if (!ok) revert TransferFailed();
            }
        } else if (toParticipants > 0 && n == 0) {
            (bool ok,) = sponsor.call{value: toParticipants}("");
            if (!ok) revert TransferFailed();
        }

        (bool okS,) = sponsor.call{value: toSponsor}("");
        if (!okS) revert TransferFailed();

        ctfStakedWei[ctfId] = 0;
        emit PunishmentExecuted(ctfId, toParticipants, toSponsor, publicCall);
    }
}
