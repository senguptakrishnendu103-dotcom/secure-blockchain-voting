// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public voters;
    address[] private voterList; // Track voters for reset
    
    uint256 public candidatesCount;
    address public admin;

    bool public electionStarted;
    bool public electionEnded;

    event VotedEvent(uint256 indexed candidateId);
    event CandidateAddedEvent(uint256 indexed candidateId, string name);
    event ElectionStartedEvent();
    event ElectionEndedEvent();
    event ElectionResetEvent();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
        electionStarted = false;
        electionEnded = false;
        
        addCandidate("Alice (Blockchain Party)");
        addCandidate("Bob (AI Party)");
        addCandidate("Charlie (IoT Party)");
    }

    function addCandidate(string memory _name) public onlyAdmin {
        require(!electionEnded, "Cannot add candidates after election has ended.");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit CandidateAddedEvent(candidatesCount, _name);
    }

    function startElection() public onlyAdmin {
        require(!electionStarted, "Election has already started.");
        require(!electionEnded, "Election has already ended. Reset first.");
        electionStarted = true;
        emit ElectionStartedEvent();
    }

    function endElection() public onlyAdmin {
        require(electionStarted, "Election has not started yet.");
        require(!electionEnded, "Election has already ended.");
        electionEnded = true;
        emit ElectionEndedEvent();
    }

    function resetElection() public onlyAdmin {
        electionStarted = false;
        electionEnded = false;

        // Reset all vote counts
        for (uint256 i = 1; i <= candidatesCount; i++) {
            candidates[i].voteCount = 0;
        }

        // Clear ALL voter records so they can vote again
        for (uint256 i = 0; i < voterList.length; i++) {
            voters[voterList[i]] = false;
        }
        delete voterList;

        emit ElectionResetEvent();
    }

    function vote(uint256 _candidateId) public {
        require(electionStarted, "Election has not started yet.");
        require(!electionEnded, "Election has ended.");
        require(!voters[msg.sender], "You have already voted.");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate.");

        voters[msg.sender] = true;
        voterList.push(msg.sender);
        candidates[_candidateId].voteCount++;

        emit VotedEvent(_candidateId);
    }

    function getCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory candArray = new Candidate[](candidatesCount);
        for (uint256 i = 1; i <= candidatesCount; i++) {
            candArray[i - 1] = candidates[i];
        }
        return candArray;
    }
}
