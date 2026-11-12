'use strict';

let players = [];
let currentIndex = 0;
let round = 1;
let phase = "reveal";
let voteRounds = [2, 4, 6];
let voteQuotas = {};
let survivorsTarget = 2;

let votes = {};
let votedSet = new Set();
let voteCandidates = null;
let isTiebreak = false;

let voteOrder = [];
let voteCursor = 0;
let pendingAction = null;

let voteElimsRemaining = 0;
let voteQuotaTotal = 0;
let voteStep = 1;
let lastVoteOutcome = '';
let secretRoomsUnlocked = [];