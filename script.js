// Core Application State
let matchState = {
    team1Name: "Team 1",
    team2Name: "Team 2",
    team1Squad: [],
    team2Squad: [],
    oversLimit: 20,
    innings: 1, // 1 or 2
    battingTeam: 1, // 1 or 2
    bowlingTeam: 2, // 2 or 1
    
    score: 0,
    wickets: 0,
    balls: 0, // Total legal & bye/leg-bye balls bowled in current innings
    extras: { wd: 0, nb: 0, b: 0, lb: 0 },
    
    strikerName: "",
    nonStrikerName: "",
    currentBowlerName: "",
    lastBowlerName: "",
    
    currentOver: [], // Current over deliveries
    
    innings1Score: 0,
    innings1Wickets: 0,
    innings1Balls: 0,
    innings1Extras: { wd: 0, nb: 0, b: 0, lb: 0 },
    innings1BowlerName: "",
    
    stats: {}, // Map of player names -> { batting: { runs, balls, fours, sixes, dismissal }, bowling: { balls, maidens, runs, wickets } }
    fallOfWickets: { 1: [], 2: [] },
    timeline: { 1: [], 2: [] },
    
    status: "setup", // "setup", "live", "ended"
    battingOrder: { 1: [], 2: [] } // Tracks order players came to bat
};

let matchHistory = []; // Stack of stringified matchState copies for Undo

// On Page Load
window.onload = function() {
    loadSavedMatch();
    initPastMatches();
    
    // Attach team name input listeners to update dropdowns dynamically
    const t1Input = document.getElementById("team1");
    const t2Input = document.getElementById("team2");
    if (t1Input && t2Input) {
        t1Input.addEventListener("input", updateSetupTeamDropdowns);
        t2Input.addEventListener("input", updateSetupTeamDropdowns);
        updateSetupTeamDropdowns();
    }
};

function updateSetupTeamDropdowns() {
    const t1Name = document.getElementById("team1").value.trim() || "Team 1";
    const t2Name = document.getElementById("team2").value.trim() || "Team 2";
    
    const updateSelectOptions = (selectId, option1Text, option2Text) => {
        const selectEl = document.getElementById(selectId);
        if (selectEl && selectEl.options.length >= 2) {
            selectEl.options[0].text = option1Text;
            selectEl.options[1].text = option2Text;
        }
    };
    
    updateSelectOptions("tossWinner", t1Name, t2Name);
    updateSelectOptions("directBattingTeam", t1Name, t2Name);
    updateSelectOptions("tossCallerSelect", t1Name, t2Name);
}

function handleTossMethodChange() {
    const method = document.getElementById("tossMethod").value;
    const manualRow = document.getElementById("tossManualInputs");
    const skipRow = document.getElementById("tossSkipInputs");
    const interactiveRow = document.getElementById("tossInteractiveBlock");
    
    if (method === "manual") {
        if (manualRow) manualRow.style.display = "grid";
        if (skipRow) skipRow.style.display = "none";
        if (interactiveRow) interactiveRow.style.display = "none";
    } else if (method === "skip") {
        if (manualRow) manualRow.style.display = "none";
        if (skipRow) skipRow.style.display = "grid";
        if (interactiveRow) interactiveRow.style.display = "none";
    } else if (method === "interactive") {
        if (manualRow) manualRow.style.display = "none";
        if (skipRow) skipRow.style.display = "none";
        if (interactiveRow) interactiveRow.style.display = "grid";
    }
}

let interactiveTossWinner = null;
let interactiveTossDecision = null;

function openCoinTossModal() {
    updateSetupTeamDropdowns();
    
    document.getElementById("tossSetupView").style.display = "block";
    document.getElementById("tossAnimationView").style.display = "none";
    document.getElementById("tossResultView").style.display = "none";
    document.getElementById("tossModalCloseActions").style.display = "flex";
    
    const coin = document.getElementById("coin");
    if (coin) {
        coin.className = "coin";
    }
    
    document.getElementById("coinTossModal").classList.add("active");
}

function closeCoinTossModal() {
    document.getElementById("coinTossModal").classList.remove("active");
}

function flipCoin() {
    const callerVal = document.getElementById("tossCallerSelect").value;
    const callVal = document.getElementById("tossCallSelect").value;
    
    const t1Name = document.getElementById("team1").value.trim() || "Team 1";
    const t2Name = document.getElementById("team2").value.trim() || "Team 2";
    
    const callerName = callerVal === "1" ? t1Name : t2Name;
    
    document.getElementById("tossSetupView").style.display = "none";
    document.getElementById("tossModalCloseActions").style.display = "none";
    document.getElementById("tossAnimationView").style.display = "block";
    
    document.getElementById("coinFlipStatus").innerText = `${callerName} called ${callVal.toUpperCase()}... Flipping! 🪙`;
    
    const coin = document.getElementById("coin");
    if (coin) {
        coin.className = "coin";
        void coin.offsetWidth; // Force layout recalculation
    }
    
    const isHeads = Math.random() < 0.5;
    const outcome = isHeads ? "heads" : "tails";
    
    if (coin) {
        coin.classList.add(isHeads ? "flip-heads" : "flip-tails");
    }
    
    let winnerIndex = "1";
    if (outcome === callVal) {
        winnerIndex = callerVal;
    } else {
        winnerIndex = callerVal === "1" ? "2" : "1";
    }
    
    const winnerName = winnerIndex === "1" ? t1Name : t2Name;
    interactiveTossWinner = winnerIndex;
    
    setTimeout(() => {
        document.getElementById("tossAnimationView").style.display = "none";
        document.getElementById("tossResultView").style.display = "block";
        
        document.getElementById("tossResultMessage").innerHTML = `
            🪙 Landed on <strong>${outcome.toUpperCase()}</strong>!<br>
            <span style="color: var(--color-success); font-weight: 750;">${winnerName} won the toss!</span>
        `;
    }, 2200);
}

function chooseTossDecision(decision) {
    interactiveTossDecision = decision;
    
    const t1Name = document.getElementById("team1").value.trim() || "Team 1";
    const t2Name = document.getElementById("team2").value.trim() || "Team 2";
    const winnerName = interactiveTossWinner === "1" ? t1Name : t2Name;
    
    const decisionText = decision === "bat" ? "bat" : "bowl";
    
    document.getElementById("interactiveTossStatus").innerHTML = `
        🎉 Toss Completed!<br>
        <strong>${winnerName}</strong> won and elected to <strong>${decisionText}</strong> first.
    `;
    document.getElementById("interactiveTossStatus").style.color = "var(--color-success)";
    
    closeCoinTossModal();
}

// --- PERSISTENCE LAYER ---

function saveState() {
    localStorage.setItem("cricket_scorer_state", JSON.stringify(matchState));
    localStorage.setItem("cricket_scorer_history", JSON.stringify(matchHistory));
}

function loadSavedMatch() {
    const savedStateStr = localStorage.getItem("cricket_scorer_state");
    const savedHistoryStr = localStorage.getItem("cricket_scorer_history");
    
    if (savedStateStr) {
        try {
            const savedState = JSON.parse(savedStateStr);
            if (savedState && savedState.status === "live") {
                const t1 = savedState.team1Name;
                const t2 = savedState.team2Name;
                const score = savedState.score;
                const wickets = savedState.wickets;
                const overs = formatOvers(savedState.balls);
                const inn = savedState.innings === 1 ? "1st Innings" : "2nd Innings";
                
                document.getElementById("resumeDetails").innerText = 
                    `${t1} vs ${t2} - ${inn}: ${score}/${wickets} (${overs} Overs)`;
                document.getElementById("resumeBanner").style.display = "flex";
            }
        } catch (e) {
            console.error("Error parsing saved state", e);
            localStorage.removeItem("cricket_scorer_state");
            localStorage.removeItem("cricket_scorer_history");
        }
    }
}

function resumeSavedMatch() {
    const savedStateStr = localStorage.getItem("cricket_scorer_state");
    const savedHistoryStr = localStorage.getItem("cricket_scorer_history");
    
    if (savedStateStr) {
        matchState = JSON.parse(savedStateStr);
        matchHistory = savedHistoryStr ? JSON.parse(savedHistoryStr) : [];
        
        document.getElementById("resumeBanner").style.display = "none";
        document.getElementById("setupScreen").style.display = "none";
        document.getElementById("scoreboard").style.display = "block";
        
        updateUI();
    }
}

function discardSavedMatch() {
    localStorage.removeItem("cricket_scorer_state");
    localStorage.removeItem("cricket_scorer_history");
    document.getElementById("resumeBanner").style.display = "none";
}

function pushHistory() {
    // Save stringified deep copy of the current state
    matchHistory.push(JSON.stringify(matchState));
}

// --- SETUP SCREEN LOGIC ---

function startMatch() {
    const t1Input = document.getElementById("team1").value.trim();
    const t2Input = document.getElementById("team2").value.trim();
    const t1Name = t1Input || "Team 1";
    const t2Name = t2Input || "Team 2";
    
    // Parse squads
    const squad1 = parseSquad("team1Squad", `${t1Name} Player`);
    const squad2 = parseSquad("team2Squad", `${t2Name} Player`);
    
    const oversLimit = parseInt(document.getElementById("totalOvers").value) || 20;
    const tossMethod = document.getElementById("tossMethod").value;
    const widePenalty = parseInt(document.getElementById("widePenalty").value) ?? 1;
    const nbPenalty = parseInt(document.getElementById("nbPenalty").value) ?? 1;
    const freeHitEnabled = document.getElementById("freeHitEnabled").checked;
    const nbCountsAsLegal = document.getElementById("nbCountsAsLegal").checked;
    
    // Determine batting & bowling teams
    let battingTeam = 1;
    let bowlingTeam = 2;
    let finalTossWinner = null;
    let finalTossDecision = null;
    
    if (tossMethod === "manual") {
        const tossWinner = document.getElementById("tossWinner").value;
        const tossDecision = document.getElementById("tossDecision").value;
        
        finalTossWinner = tossWinner === "1" ? t1Name : t2Name;
        finalTossDecision = tossDecision;
        
        if (tossWinner === "1") {
            if (tossDecision === "bowl") {
                battingTeam = 2;
                bowlingTeam = 1;
            }
        } else {
            if (tossDecision === "bat") {
                battingTeam = 2;
                bowlingTeam = 1;
            }
        }
    } else if (tossMethod === "interactive") {
        if (!interactiveTossWinner || !interactiveTossDecision) {
            alert("Please launch and complete the Interactive Coin Toss first!");
            return;
        }
        finalTossWinner = interactiveTossWinner === "1" ? t1Name : t2Name;
        finalTossDecision = interactiveTossDecision;
        
        if (interactiveTossWinner === "1") {
            if (interactiveTossDecision === "bowl") {
                battingTeam = 2;
                bowlingTeam = 1;
            }
        } else {
            if (interactiveTossDecision === "bat") {
                battingTeam = 2;
                bowlingTeam = 1;
            }
        }
    } else if (tossMethod === "skip") {
        const directBat = document.getElementById("directBattingTeam").value;
        battingTeam = parseInt(directBat);
        bowlingTeam = battingTeam === 1 ? 2 : 1;
        
        finalTossWinner = null;
        finalTossDecision = null;
    }
    
    const battingSquad = battingTeam === 1 ? squad1 : squad2;
    const bowlingSquad = bowlingTeam === 1 ? squad1 : squad2;
    
    // Initialize Match State
    matchState = {
        team1Name: t1Name,
        team2Name: t2Name,
        team1Squad: squad1,
        team2Squad: squad2,
        oversLimit: oversLimit,
        innings: 1,
        battingTeam: battingTeam,
        bowlingTeam: bowlingTeam,
        
        tossMethod: tossMethod,
        tossWinnerName: finalTossWinner,
        tossDecision: finalTossDecision,
        
        widePenalty: widePenalty,
        nbPenalty: nbPenalty,
        freeHitEnabled: freeHitEnabled,
        nbCountsAsLegal: nbCountsAsLegal,
        freeHitActive: false,
        
        score: 0,
        wickets: 0,
        balls: 0,
        extras: { wd: 0, nb: 0, b: 0, lb: 0 },
        
        strikerName: battingSquad[0],
        nonStrikerName: battingSquad[1],
        currentBowlerName: bowlingSquad[0],
        lastBowlerName: "",
        
        currentOver: [],
        
        innings1Score: 0,
        innings1Wickets: 0,
        innings1Balls: 0,
        innings1Extras: { wd: 0, nb: 0, b: 0, lb: 0 },
        innings1BowlerName: "",
        
        stats: {},
        fallOfWickets: { 1: [], 2: [] },
        timeline: { 1: [], 2: [] },
        
        status: "live",
        battingOrder: { 1: [battingSquad[0], battingSquad[1]], 2: [] },
        startTime: Date.now(),
        matchDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    };
    
    // Initialize stats database
    squad1.forEach(name => {
        matchState.stats[name] = {
            batting: { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "yet to bat" },
            bowling: { balls: 0, maidens: 0, runs: 0, wickets: 0 }
        };
    });
    squad2.forEach(name => {
        matchState.stats[name] = {
            batting: { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "yet to bat" },
            bowling: { balls: 0, maidens: 0, runs: 0, wickets: 0 }
        };
    });
    
    // Set opening batters as active
    matchState.stats[matchState.strikerName].batting.dismissal = "not out";
    matchState.stats[matchState.nonStrikerName].batting.dismissal = "not out";
    
    matchHistory = []; // Reset history
    
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("scoreboard").style.display = "block";
    
    saveState();
    updateUI();
}

function parseSquad(textareaId, defaultPrefix) {
    const text = document.getElementById(textareaId).value;
    let list = text.split("\n")
        .map(name => name.trim())
        .filter(name => name.length > 0);
        
    // Generate default squad if empty
    if (list.length === 0) {
        for (let i = 1; i <= 11; i++) {
            list.push(`${defaultPrefix} ${i}`);
        }
    } else if (list.length < 2) {
        // Guarantee at least 2 players
        while (list.length < 2) {
            list.push(`${defaultPrefix} ${list.length + 1}`);
        }
    }
    return list;
}

// --- TAB SWITCHING ---

function switchTab(tab) {
    const tabs = ["live", "scorecard", "timeline"];
    tabs.forEach(t => {
        const btn = document.getElementById(`tabBtn${capitalize(t)}`);
        const panel = document.getElementById(`tabPanel${capitalize(t)}`);
        if (t === tab) {
            btn.classList.add("active");
            panel.style.display = "block";
        } else {
            btn.classList.remove("active");
            panel.style.display = "none";
        }
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- RECORD SCORING EVENTS ---

function addRun(run) {
    if (matchState.status !== "live") return;
    
    pushHistory();
    
    // Clear Free Hit status after a legal delivery is played
    let freeHitWasActive = false;
    if (matchState.freeHitActive) {
        freeHitWasActive = true;
        matchState.freeHitActive = false;
    }
    
    // Update Score
    matchState.score += run;
    matchState.balls++;
    
    // Update Striker Batting Stats
    let bat = matchState.stats[matchState.strikerName].batting;
    bat.runs += run;
    bat.balls++;
    if (run === 4) {
        bat.fours++;
        triggerCelebration(4);
    }
    if (run === 6) {
        bat.sixes++;
        triggerCelebration(6);
    }
    
    // Update Bowler Stats
    let bowl = matchState.stats[matchState.currentBowlerName].bowling;
    bowl.runs += run;
    bowl.balls++;
    
    // Save striker name before potentially swapping strike
    let strikerBefore = matchState.strikerName;
    
    // Record ball in current over
    matchState.currentOver.push(run.toString());
    
    // Timeline entry
    const overNum = formatOvers(matchState.balls - 1);
    const freeHitSuffix = freeHitWasActive ? " (Free Hit)" : "";
    addTimelineItem(
        run.toString(), 
        `${matchState.currentBowlerName} to ${strikerBefore}${freeHitSuffix}`, 
        `${run === 4 ? "FOUR! " : run === 6 ? "SIX! " : ""}${run} run(s) scored.`
    );
    
    // Swap strike on odd runs
    if (run % 2 !== 0) {
        swapStrikerEnd();
    }
    
    checkInningsOrOverEnd();
}

function addExtra(type) {
    if (matchState.status !== "live") return;
    
    if (type === "wd") {
        const extraStr = prompt("Additional runs on Wide? (Enter 0 if just wide)", "0");
        if (extraStr === null) return; // Cancelled
        const extra = parseInt(extraStr) || 0;
        
        pushHistory();
        const penalty = (matchState.widePenalty !== undefined) ? matchState.widePenalty : 1;
        const totalWideRuns = penalty + extra;
        
        matchState.score += totalWideRuns;
        matchState.extras.wd += totalWideRuns;
        
        // Bowler charged with wide runs, but Wide is not a legal ball
        matchState.stats[matchState.currentBowlerName].bowling.runs += totalWideRuns;
        
        const ballLabel = totalWideRuns > 1 ? `${totalWideRuns}Wd` : "Wd";
        matchState.currentOver.push(ballLabel);
        
        const freeHitSuffix = matchState.freeHitActive ? " (Free Hit)" : "";
        addTimelineItem(
            "Wd", 
            `${matchState.currentBowlerName} to ${matchState.strikerName}${freeHitSuffix}`,
            `Wide ball. Conceded ${totalWideRuns} runs.`
        );
        
    } else if (type === "nb") {
        const batRunsStr = prompt("Runs scored off the bat on this No Ball? (Enter 0 if none)", "0");
        if (batRunsStr === null) return;
        const batRuns = parseInt(batRunsStr) || 0;
        
        pushHistory();
        const penalty = (matchState.nbPenalty !== undefined) ? matchState.nbPenalty : 1;
        const totalNbRuns = penalty + batRuns;
        
        matchState.score += totalNbRuns;
        matchState.extras.nb += penalty;
        
        // Batsman gets runs off the bat, faces a ball (in standard records, batsman faces the NB)
        let bat = matchState.stats[matchState.strikerName].batting;
        bat.runs += batRuns;
        bat.balls++;
        if (batRuns === 4) {
            bat.fours++;
            triggerCelebration(4);
        }
        if (batRuns === 6) {
            bat.sixes++;
            triggerCelebration(6);
        }
        
        // Bowler charged with all runs on a no-ball, no legal ball unless toggle is enabled
        matchState.stats[matchState.currentBowlerName].bowling.runs += totalNbRuns;
        if (matchState.nbCountsAsLegal) {
            matchState.stats[matchState.currentBowlerName].bowling.balls++;
            matchState.balls++;
        }
        
        const ballLabel = batRuns > 0 ? `${batRuns}Nb` : "Nb";
        matchState.currentOver.push(ballLabel);
        
        let strikerBefore = matchState.strikerName;
        const freeHitSuffix = matchState.freeHitActive ? " (Free Hit)" : "";
        addTimelineItem(
            "Nb", 
            `${matchState.currentBowlerName} to ${strikerBefore}${freeHitSuffix}`,
            `No Ball. ${batRuns} runs off the bat. Total ${totalNbRuns} runs.`
        );
        
        // Set Free Hit active on No Ball if enabled
        if (matchState.freeHitEnabled) {
            matchState.freeHitActive = true;
        }
        
        // Swap strike on odd runs scored off the bat
        if (batRuns % 2 !== 0) {
            swapStrikerEnd();
        }
        
    } else if (type === "b" || type === "lb") {
        const byeRunsStr = prompt(`How many ${type === "b" ? "Bye" : "Leg Bye"} runs?`, "1");
        if (byeRunsStr === null) return;
        const byeRuns = parseInt(byeRunsStr) || 1;
        
        pushHistory();
        
        // Clear Free Hit status after a legal delivery is played
        let freeHitWasActive = false;
        if (matchState.freeHitActive) {
            freeHitWasActive = true;
            matchState.freeHitActive = false;
        }
        
        matchState.score += byeRuns;
        if (type === "b") {
            matchState.extras.b += byeRuns;
        } else {
            matchState.extras.lb += byeRuns;
        }
        
        // Batsman faces a ball, but gets no runs
        matchState.stats[matchState.strikerName].batting.balls++;
        
        // Bowler bowls a legal ball, but is not charged with bye/leg bye runs
        matchState.stats[matchState.currentBowlerName].bowling.balls++;
        matchState.balls++;
        
        const ballLabel = `${byeRuns}${type === "b" ? "B" : "Lb"}`;
        matchState.currentOver.push(ballLabel);
        
        let strikerBefore = matchState.strikerName;
        const freeHitSuffix = freeHitWasActive ? " (Free Hit)" : "";
        addTimelineItem(
            type.toUpperCase(), 
            `${matchState.currentBowlerName} to ${strikerBefore}${freeHitSuffix}`,
            `${byeRuns} ${type === "b" ? "Bye" : "Leg Bye"} runs. (Counts as legal ball)`
        );
        
        // Swap strike on odd bye/leg bye runs
        if (byeRuns % 2 !== 0) {
            swapStrikerEnd();
        }
    }
    
    checkInningsOrOverEnd();
}

function swapStrike() {
    if (matchState.status !== "live") return;
    pushHistory();
    swapStrikerEnd();
    saveState();
    updateUI();
}

function swapStrikerEnd() {
    const tmp = matchState.strikerName;
    matchState.strikerName = matchState.nonStrikerName;
    matchState.nonStrikerName = tmp;
}

// --- WICKET FLOW ---

function openWicketModal() {
    if (matchState.status !== "live") return;
    
    // Show/hide Free Hit warning and customize dismissal options
    const isFreeHit = matchState.freeHitActive === true;
    const fhWarning = document.getElementById("wicketFreeHitWarning");
    if (fhWarning) {
        fhWarning.style.display = isFreeHit ? "flex" : "none";
    }
    
    const selectDismissal = document.getElementById("dismissalType");
    if (selectDismissal) {
        if (isFreeHit) {
            selectDismissal.innerHTML = `
                <option value="Run Out">Run Out</option>
                <option value="Retired Hurt">Retired Hurt</option>
            `;
        } else {
            selectDismissal.innerHTML = `
                <option value="Bowled">Bowled</option>
                <option value="Caught">Caught</option>
                <option value="LBW">LBW</option>
                <option value="Run Out">Run Out</option>
                <option value="Stumped">Stumped</option>
                <option value="Hit Wicket">Hit Wicket</option>
                <option value="Retired Hurt">Retired Hurt</option>
            `;
        }
    }
    
    // Populate batsmen drop-down
    const selectDismissed = document.getElementById("dismissedBatsman");
    selectDismissed.innerHTML = `
        <option value="${matchState.strikerName}">${matchState.strikerName} (Striker)</option>
        <option value="${matchState.nonStrikerName}">${matchState.nonStrikerName} (Non-Striker)</option>
    `;
    
    // Populate next batsman dropdown
    const selectNext = document.getElementById("nextBatsman");
    selectNext.innerHTML = "";
    
    const battingSquad = matchState.battingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
    
    // Find all players yet to bat
    const yetToBat = battingSquad.filter(name => {
        return matchState.stats[name].batting.dismissal === "yet to bat" &&
               name !== matchState.strikerName &&
               name !== matchState.nonStrikerName;
    });
    
    // Check if this is the last wicket (no players left to bat)
    const wicketsLimit = battingSquad.length - 1;
    const isLastWicket = (matchState.wickets + 1 >= wicketsLimit) || (yetToBat.length === 0);
    
    if (isLastWicket) {
        document.getElementById("newBatsmanInputGroup").style.display = "none";
    } else {
        document.getElementById("newBatsmanInputGroup").style.display = "block";
        yetToBat.forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.text = name;
            selectNext.appendChild(opt);
        });
    }
    
    document.getElementById("fielderName").value = "";
    if (selectDismissal) {
        selectDismissal.value = isFreeHit ? "Run Out" : "Bowled";
    }
    toggleFielderInput();
    
    document.getElementById("wicketModal").classList.add("active");
}

function closeWicketModal() {
    document.getElementById("wicketModal").classList.remove("active");
}

function toggleFielderInput() {
    const type = document.getElementById("dismissalType").value;
    const fielderGroup = document.getElementById("fielderInputGroup");
    if (type === "Caught" || type === "Run Out" || type === "Stumped") {
        fielderGroup.style.display = "block";
    } else {
        fielderGroup.style.display = "none";
    }
}

function confirmWicket() {
    const dismissedName = document.getElementById("dismissedBatsman").value;
    const dismissalType = document.getElementById("dismissalType").value;
    const fielderName = document.getElementById("fielderName").value.trim();
    const nextName = document.getElementById("nextBatsman").value;
    
    pushHistory();
    
    // Clear Free Hit status after a legal delivery is played
    if (matchState.freeHitActive) {
        matchState.freeHitActive = false;
    }
    
    // Update score counts
    matchState.wickets++;
    matchState.balls++;
    
    // Bowler gets credit for legal ball
    matchState.stats[matchState.currentBowlerName].bowling.balls++;
    
    // Batsman gets credit for facing the ball
    // (Only striker faces the ball, but non-striker could get run-out. However, the ball is still bowled to striker)
    matchState.stats[matchState.strikerName].batting.balls++;
    
    matchState.currentOver.push("W");
    
    // Format dismissal text
    let dismissalText = "";
    let isBowlerWicket = false;
    
    const bowler = matchState.currentBowlerName;
    
    if (dismissalType === "Bowled") {
        dismissalText = `b ${bowler}`;
        isBowlerWicket = true;
    } else if (dismissalType === "LBW") {
        dismissalText = `lbw b ${bowler}`;
        isBowlerWicket = true;
    } else if (dismissalType === "Caught") {
        dismissalText = fielderName ? `c ${fielderName} b ${bowler}` : `c & b ${bowler}`;
        isBowlerWicket = true;
    } else if (dismissalType === "Stumped") {
        dismissalText = fielderName ? `st ${fielderName} b ${bowler}` : `st b ${bowler}`;
        isBowlerWicket = true;
    } else if (dismissalType === "Run Out") {
        dismissalText = fielderName ? `run out (${fielderName})` : "run out";
        isBowlerWicket = false; // Not a bowler's wicket
    } else if (dismissalType === "Hit Wicket") {
        dismissalText = `hit wicket b ${bowler}`;
        isBowlerWicket = true;
    } else if (dismissalType === "Retired Hurt") {
        dismissalText = "retired hurt";
        isBowlerWicket = false;
        // Wickets is counted, but bowler doesn't get it
    }
    
    // Save batsman dismissal stats
    matchState.stats[dismissedName].batting.dismissal = dismissalText;
    
    if (isBowlerWicket) {
        matchState.stats[bowler].bowling.wickets++;
    }
    
    // Record Fall of Wicket (FoW)
    const currentScore = matchState.score;
    const overStamp = formatOvers(matchState.balls);
    matchState.fallOfWickets[matchState.innings].push({
        wicketNumber: matchState.wickets,
        score: currentScore,
        over: overStamp,
        batsmanOut: dismissedName,
        bowler: bowler
    });
    
    addTimelineItem(
        "W", 
        `WICKET! ${dismissedName}`,
        `${dismissalText}. Score: ${currentScore}/${matchState.wickets} (${overStamp} Ov)`
    );
    
    // Check if Innings / Match ends (e.g. all out)
    const battingSquad = matchState.battingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
    const wicketsLimit = battingSquad.length - 1;
    
    closeWicketModal();
    
    if (matchState.wickets >= wicketsLimit) {
        // Innings is over - all out
        handleInningsEnd("All Out");
    } else {
        // Bring in new batsman
        if (dismissedName === matchState.strikerName) {
            matchState.strikerName = nextName;
        } else {
            matchState.nonStrikerName = nextName;
        }
        
        matchState.stats[nextName].batting.dismissal = "not out";
        
        // Add to batting order tracker
        if (!matchState.battingOrder[matchState.innings].includes(nextName)) {
            matchState.battingOrder[matchState.innings].push(nextName);
        }
        
        checkInningsOrOverEnd();
    }
}

// --- HISTORY UNDO ---

function undo() {
    if (matchHistory.length === 0) {
        alert("No actions to undo!");
        return;
    }
    
    const previousStateStr = matchHistory.pop();
    matchState = JSON.parse(previousStateStr);
    
    saveState();
    updateUI();
}

// --- TIMELINE BUILDER ---

function addTimelineItem(badge, event, desc) {
    const overNum = formatOvers(matchState.balls);
    const inn = matchState.innings;
    
    if (!matchState.timeline[inn]) {
        matchState.timeline[inn] = [];
    }
    
    matchState.timeline[inn].unshift({
        badge,
        event,
        desc,
        over: overNum
    });
}

// --- OVER & INNINGS TRANSITIONS ---

function checkInningsOrOverEnd() {
    let limitBalls = matchState.oversLimit * 6;
    let battingSquad = matchState.battingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
    
    // 1. Check if Target is chased in Innings 2
    if (matchState.innings === 2) {
        let target = matchState.innings1Score + 1;
        if (matchState.score >= target) {
            let winText = `${matchState.battingTeam === 1 ? matchState.team1Name : matchState.team2Name} wins by ${battingSquad.length - 1 - matchState.wickets} wickets!`;
            endMatch(winText);
            return;
        }
    }
    
    // 2. Check if all out
    if (matchState.wickets >= battingSquad.length - 1) {
        handleInningsEnd("All Out");
        return;
    }
    
    // 3. Check if overs completed
    if (matchState.balls >= limitBalls) {
        handleInningsEnd("Overs Completed");
        return;
    }
    
    // 4. Check if over completed (6 legal balls)
    let legalBallsInOver = matchState.currentOver.filter(ball => {
        if (matchState.nbCountsAsLegal) {
            return !ball.includes("Wd"); // Nb is counted as a legal ball
        } else {
            return !ball.includes("Wd") && !ball.includes("Nb"); // Nb is not legal (rebowl)
        }
    }).length;
    
    if (legalBallsInOver === 6) {
        handleOverEnd();
    } else {
        saveState();
        updateUI();
    }
}

function handleOverEnd() {
    // Check for Maiden Over
    // We check runs conceded in the current over
    let runsConceded = 0;
    matchState.currentOver.forEach(ball => {
        if (ball.includes("Wd")) {
            runsConceded += parseInt(ball) || 1;
        } else if (ball.includes("Nb")) {
            runsConceded += parseInt(ball) || 1;
        } else if (ball === "W") {
            // 0 runs
        } else if (ball.includes("B") || ball.includes("Lb")) {
            // Byes/Leg byes do not count towards bowler runs
        } else {
            runsConceded += parseInt(ball) || 0;
        }
    });
    
    if (runsConceded === 0) {
        matchState.stats[matchState.currentBowlerName].bowling.maidens++;
    }
    
    // Save previous bowler
    matchState.lastBowlerName = matchState.currentBowlerName;
    matchState.currentOver = [];
    
    // Swap batsman strike
    swapStrikerEnd();
    
    // Show bowler selection modal
    openBowlerModal();
}

function openBowlerModal() {
    const selectBowler = document.getElementById("nextBowlerSelect");
    selectBowler.innerHTML = "";
    
    const bowlingSquad = matchState.bowlingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
    
    // Exclude the bowler who just finished, unless it's the only bowler
    let availableBowlers = bowlingSquad.filter(name => name !== matchState.lastBowlerName);
    if (availableBowlers.length === 0) {
        availableBowlers = bowlingSquad;
    }
    
    availableBowlers.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.text = name;
        selectBowler.appendChild(opt);
    });
    
    document.getElementById("bowlerModal").classList.add("active");
}

function confirmNextBowler() {
    const nextBowler = document.getElementById("nextBowlerSelect").value;
    if (!nextBowler) return;
    
    matchState.currentBowlerName = nextBowler;
    document.getElementById("bowlerModal").classList.remove("active");
    
    saveState();
    updateUI();
}

function handleInningsEnd(reason) {
    if (matchState.innings === 1) {
        alert(`End of 1st Innings: ${reason}\nScore: ${matchState.score}/${matchState.wickets}`);
        
        // Save Innings 1 score details
        matchState.innings1Score = matchState.score;
        matchState.innings1Wickets = matchState.wickets;
        matchState.innings1Balls = matchState.balls;
        matchState.innings1Extras = { ...matchState.extras };
        matchState.innings1BowlerName = matchState.currentBowlerName;
        
        // Swap teams
        matchState.innings = 2;
        
        let oldBatting = matchState.battingTeam;
        matchState.battingTeam = matchState.bowlingTeam;
        matchState.bowlingTeam = oldBatting;
        
        // Reset scoreboard variables for Innings 2
        matchState.score = 0;
        matchState.wickets = 0;
        matchState.balls = 0;
        matchState.extras = { wd: 0, nb: 0, b: 0, lb: 0 };
        matchState.currentOver = [];
        
        const battingSquad = matchState.battingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
        const bowlingSquad = matchState.bowlingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
        
        matchState.strikerName = battingSquad[0];
        matchState.nonStrikerName = battingSquad[1];
        matchState.currentBowlerName = bowlingSquad[0];
        matchState.lastBowlerName = "";
        
        // Mark new opening batsmen
        matchState.stats[matchState.strikerName].batting.dismissal = "not out";
        matchState.stats[matchState.nonStrikerName].batting.dismissal = "not out";
        
        matchState.battingOrder[2] = [matchState.strikerName, matchState.nonStrikerName];
        
        // Save and prompt bowler select for new innings
        saveState();
        updateUI();
        openBowlerModal();
        
    } else {
        // Innings 2 ended
        let target = matchState.innings1Score + 1;
        if (matchState.score >= target) {
            let winText = `${matchState.battingTeam === 1 ? matchState.team1Name : matchState.team2Name} wins!`;
            endMatch(winText);
        } else if (matchState.score < target - 1) {
            let winText = `${matchState.bowlingTeam === 1 ? matchState.team1Name : matchState.team2Name} wins by ${matchState.innings1Score - matchState.score} runs!`;
            endMatch(winText);
        } else {
            endMatch("Match Tied! Scores are level.");
        }
    }
}

function endMatch(winnerMessage) {
    matchState.status = "ended";
    saveState();
    
    document.getElementById("matchWinnerMessage").innerText = winnerMessage;
    
    const summary = `
        1st Innings: ${matchState.bowlingTeam === 1 ? matchState.team1Name : matchState.team2Name} - ${matchState.innings1Score}/${matchState.innings1Wickets} (${formatOvers(matchState.innings1Balls)} Overs)<br>
        2nd Innings: ${matchState.battingTeam === 1 ? matchState.team1Name : matchState.team2Name} - ${matchState.score}/${matchState.wickets} (${formatOvers(matchState.balls)} Overs)
    `;
    
    document.getElementById("matchSummaryMessage").innerHTML = summary;
    document.getElementById("matchEndModal").classList.add("active");
    
    saveCompletedMatch();
    updateUI();
}

function closeMatchEndModal() {
    document.getElementById("matchEndModal").classList.remove("active");
}

function restartMatchSetup() {
    discardSavedMatch();
    document.getElementById("matchEndModal").classList.remove("active");
    document.getElementById("scoreboard").style.display = "none";
    document.getElementById("setupScreen").style.display = "block";
    
    // Reset inputs
    document.getElementById("team1").value = "Team 1";
    document.getElementById("team2").value = "Team 2";
    document.getElementById("totalOvers").value = 20;
    
    location.reload();
}

// --- RENDERING & UI UPDATES ---

function updateUI() {
    const battingTeamName = matchState.battingTeam === 1 ? matchState.team1Name : matchState.team2Name;
    const bowlingTeamName = matchState.bowlingTeam === 1 ? matchState.team1Name : matchState.team2Name;
    
    // Match titles
    document.getElementById("matchTitle").innerText = `${matchState.team1Name} vs ${matchState.team2Name}`;
    
    // Set Toss Details sub-header
    const tossDetailEl = document.getElementById("matchTossDetail");
    if (tossDetailEl) {
        if (matchState.tossMethod === "skip") {
            tossDetailEl.innerText = "Toss: Skipped (Direct Setup)";
        } else if (matchState.tossWinnerName && matchState.tossDecision) {
            const decisionStr = matchState.tossDecision === "bat" ? "elected to bat" : "elected to bowl";
            tossDetailEl.innerText = `Toss: ${matchState.tossWinnerName} won and ${decisionStr} first`;
        } else {
            tossDetailEl.innerText = "";
        }
    }
    
    // Render Free Hit badge
    const fhBadge = document.getElementById("freeHitBadge");
    if (fhBadge) {
        fhBadge.style.display = matchState.freeHitActive ? "inline-flex" : "none";
    }
    
    // Status Badge
    let statusText = `Innings ${matchState.innings} - ${battingTeamName} batting`;
    if (matchState.status === "ended") {
        statusText = "Match Finished";
    }
    document.getElementById("matchStatusBadge").innerText = statusText;
    
    // Scoreboard digits
    document.getElementById("score").innerText = `${matchState.score}/${matchState.wickets}`;
    document.getElementById("overs").innerText = `(${formatOvers(matchState.balls)} Overs)`;
    
    // Rates
    const crr = matchState.balls ? (matchState.score / (matchState.balls / 6)).toFixed(2) : "0.00";
    document.getElementById("crr").innerText = crr;
    
    const ext = matchState.extras;
    const totalExtCount = ext.wd + ext.nb + ext.b + ext.lb;
    document.getElementById("totalExtras").innerText = 
        `${totalExtCount} (wd ${ext.wd}, nb ${ext.nb}, b ${ext.b}, lb ${ext.lb})`;
        
    // Innings 2 Target Box
    if (matchState.innings === 2) {
        document.getElementById("rrrBox").style.display = "block";
        document.getElementById("targetBox").style.visibility = "visible";
        
        let target = matchState.innings1Score + 1;
        document.getElementById("targetScore").innerText = target;
        
        let limitBalls = matchState.oversLimit * 6;
        let ballsRemaining = limitBalls - matchState.balls;
        let runsRequired = target - matchState.score;
        
        if (runsRequired <= 0) {
            document.getElementById("targetEquation").innerText = "Target Chased!";
            document.getElementById("rrr").innerText = "0.00";
        } else if (ballsRemaining <= 0) {
            document.getElementById("targetEquation").innerText = `Innings complete. Defending team wins by ${runsRequired - 1} runs.`;
            document.getElementById("rrr").innerText = "99.99";
        } else {
            const rrr = (runsRequired / (ballsRemaining / 6)).toFixed(2);
            document.getElementById("rrr").innerText = rrr;
            
            let oversRemainingStr = formatOvers(ballsRemaining);
            document.getElementById("targetEquation").innerText = 
                `Need ${runsRequired} runs from ${ballsRemaining} balls (${oversRemainingStr} Overs)`;
        }
    } else {
        document.getElementById("rrrBox").style.display = "none";
        document.getElementById("targetBox").style.visibility = "hidden";
    }
    
    // Render live panels
    renderCurrentOverBalls();
    renderLiveStats();
    renderScorecardTab();
    renderTimelineTab();
    updateTwoSiderNotice();
}

function updateTwoSiderNotice() {
    let hasTwoSider = false;
    if (matchState.stats) {
        hasTwoSider = Object.values(matchState.stats).some(p => p && p.isTwoSider === true);
    }
    
    const liveNotice = document.getElementById("liveTwoSiderNotice");
    const scorecardNotice = document.getElementById("scorecardTwoSiderNotice");
    
    let twoSiders = new Set();
    if (hasTwoSider && matchState.stats) {
        Object.keys(matchState.stats).forEach(name => {
            if (matchState.stats[name].isTwoSider) {
                let baseName = name.replace(" (T1)", "").replace(" (T2)", "");
                twoSiders.add(baseName);
            }
        });
    }
    
    if (hasTwoSider && twoSiders.size > 0) {
        const namesList = Array.from(twoSiders).join(", ");
        if (liveNotice) {
            liveNotice.style.display = "flex";
            const nameSpan = liveNotice.querySelector(".two-sider-names");
            if (nameSpan) nameSpan.innerText = namesList;
        }
        if (scorecardNotice) {
            scorecardNotice.style.display = "flex";
            const nameSpan = scorecardNotice.querySelector(".two-sider-names");
            if (nameSpan) nameSpan.innerText = namesList;
        }
    } else {
        if (liveNotice) liveNotice.style.display = "none";
        if (scorecardNotice) scorecardNotice.style.display = "none";
    }
}

function renderCurrentOverBalls() {
    const list = document.getElementById("currentOver");
    list.innerHTML = "";
    
    if (matchState.currentOver.length === 0) {
        list.innerHTML = `<span class="text-muted" style="font-size: 0.95rem;">Waiting for first delivery...</span>`;
        return;
    }
    
    matchState.currentOver.forEach(ball => {
        const bubble = document.createElement("span");
        bubble.className = "ball-circle";
        
        if (ball === "0") {
            bubble.classList.add("dot");
        } else if (ball === "4") {
            bubble.classList.add("four");
        } else if (ball === "6") {
            bubble.classList.add("six");
        } else if (ball === "W") {
            bubble.classList.add("wicket");
        } else if (ball.includes("Wd") || ball.includes("Nb")) {
            bubble.classList.add("extra");
        }
        
        bubble.innerText = ball;
        list.appendChild(bubble);
    });
}

function renderLiveStats() {
    // Batters Table
    const batTable = document.getElementById("liveBattingTable");
    batTable.innerHTML = "";
    
    const strikerStats = matchState.stats[matchState.strikerName].batting;
    const nonStrikerStats = matchState.stats[matchState.nonStrikerName].batting;
    
    const sr1 = strikerStats.balls ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(2) : "0.00";
    const sr2 = nonStrikerStats.balls ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(2) : "0.00";
    
    // Two-Sider Indicators
    let strikerDisp = matchState.strikerName + (matchState.stats[matchState.strikerName].isTwoSider ? " ↔️" : "");
    let nonStrikerDisp = matchState.nonStrikerName + (matchState.stats[matchState.nonStrikerName].isTwoSider ? " ↔️" : "");
    let bowlerDisp = matchState.currentBowlerName + (matchState.stats[matchState.currentBowlerName].isTwoSider ? " ↔️" : "");
    
    // Striker Row
    let row1 = `
        <tr class="on-strike">
            <td>
                <span class="strike-dot"></span> ${strikerDisp} *
                <button onclick="openEditPlayerModal('striker')" style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; margin-left: 8px;">Edit ✏️</button>
            </td>
            <td>${strikerStats.runs}</td>
            <td>${strikerStats.balls}</td>
            <td>${strikerStats.fours}</td>
            <td>${strikerStats.sixes}</td>
            <td>${sr1}</td>
        </tr>
    `;
    // Non Striker Row
    let row2 = `
        <tr>
            <td>
                ${nonStrikerDisp}
                <button onclick="openEditPlayerModal('nonStriker')" style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; margin-left: 8px;">Edit ✏️</button>
            </td>
            <td>${nonStrikerStats.runs}</td>
            <td>${nonStrikerStats.balls}</td>
            <td>${nonStrikerStats.fours}</td>
            <td>${nonStrikerStats.sixes}</td>
            <td>${sr2}</td>
        </tr>
    `;
    
    batTable.innerHTML = row1 + row2;
    
    // Partnership Calculation
    let partRuns = strikerStats.runs + nonStrikerStats.runs;
    let partBalls = strikerStats.balls + nonStrikerStats.balls;
    document.getElementById("partnershipText").innerText = `Partnership: ${partRuns} (${partBalls} balls)`;
    
    // Bowler Table
    const bowlTable = document.getElementById("liveBowlingTable");
    bowlTable.innerHTML = "";
    
    const bowlerStats = matchState.stats[matchState.currentBowlerName].bowling;
    const econ = bowlerStats.balls ? (bowlerStats.runs / (bowlerStats.balls / 6)).toFixed(2) : "0.00";
    
    let bowlRow = `
        <tr>
            <td>
                ${bowlerDisp}
                <button onclick="openEditPlayerModal('bowler')" style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; margin-left: 8px;">Edit ✏️</button>
            </td>
            <td>${formatOvers(bowlerStats.balls)}</td>
            <td>${bowlerStats.maidens}</td>
            <td>${bowlerStats.runs}</td>
            <td>${bowlerStats.wickets}</td>
            <td>${econ}</td>
        </tr>
    `;
    bowlTable.innerHTML = bowlRow;
}

function renderScorecardTab() {
    // Update Scorecard titles
    const inn1BatTeam = matchState.innings === 1 ? matchState.battingTeam : matchState.bowlingTeam;
    const t1Name = inn1BatTeam === 1 ? matchState.team1Name : matchState.team2Name;
    const t2Name = inn1BatTeam === 1 ? matchState.team2Name : matchState.team1Name;
    
    document.getElementById("team1ScorecardTitle").innerText = `${t1Name} Innings (1st Innings)`;
    document.getElementById("team2ScorecardTitle").innerText = `${t2Name} Innings (2nd Innings)`;
    
    // RENDER INNINGS 1 Batting
    const squad1 = inn1BatTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
    const bowlSquad1 = inn1BatTeam === 1 ? matchState.team2Squad : matchState.team1Squad;
    
    renderInningsScorecard(
        1, 
        squad1, 
        bowlSquad1, 
        "team1BattingRows", 
        "team1BowlingRows", 
        "team1FowList", 
        "team1ExtrasRow", 
        "team1ExtrasBreakdown",
        "team1TotalText"
    );
    
    // Show/hide Innings 2 Card
    if (matchState.innings === 2 || matchState.status === "ended") {
        document.getElementById("team2ScorecardBlock").style.display = "block";
        const squad2 = inn1BatTeam === 1 ? matchState.team2Squad : matchState.team1Squad;
        const bowlSquad2 = inn1BatTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
        
        renderInningsScorecard(
            2, 
            squad2, 
            bowlSquad2, 
            "team2BattingRows", 
            "team2BowlingRows", 
            "team2FowList", 
            "team2ExtrasRow", 
            "team2ExtrasBreakdown",
            "team2TotalText"
        );
    } else {
        document.getElementById("team2ScorecardBlock").style.display = "none";
    }
}

function renderInningsScorecard(innNum, batSquad, bowlSquad, batTbodyId, bowlTbodyId, fowDivId, extRowId, extBreakId, totalTextId) {
    const batTbody = document.getElementById(batTbodyId);
    const bowlTbody = document.getElementById(bowlTbodyId);
    const fowDiv = document.getElementById(fowDivId);
    
    // Clear out
    batTbody.innerHTML = "";
    bowlTbody.innerHTML = "";
    fowDiv.innerHTML = "";
    
    // Batting Rows
    // List who has batted in order of appearance, followed by yet to bat
    let battedList = matchState.battingOrder[innNum] || [];
    
    // Append yet to bat players
    const yetToBat = batSquad.filter(name => !battedList.includes(name));
    const fullOrder = [...battedList, ...yetToBat];
    
    fullOrder.forEach(name => {
        const stats = matchState.stats[name].batting;
        const sr = stats.balls ? ((stats.runs / stats.balls) * 100).toFixed(2) : "0.00";
        
        // Determine strike indicator
        let dispName = name;
        if (matchState.stats[name] && matchState.stats[name].isTwoSider) {
            dispName += " ↔️";
        }
        if (matchState.status === "live" && matchState.innings === innNum) {
            if (name === matchState.strikerName) {
                dispName = `⚡ ${dispName} *`;
            }
        }
        
        const row = `
            <tr class="${(matchState.status === "live" && matchState.innings === innNum && (name === matchState.strikerName || name === matchState.nonStrikerName)) ? "on-strike" : ""}">
                <td>${dispName}</td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${stats.dismissal}</td>
                <td>${stats.runs}</td>
                <td>${stats.balls}</td>
                <td>${stats.fours}</td>
                <td>${stats.sixes}</td>
                <td>${sr}</td>
            </tr>
        `;
        batTbody.innerHTML += row;
    });
    
    // Extras Breakdown
    let ext, runsCount, wicketsCount, ballsCount;
    if (matchState.innings === innNum) {
        ext = matchState.extras;
        runsCount = matchState.score;
        wicketsCount = matchState.wickets;
        ballsCount = matchState.balls;
    } else {
        // Innings 1 cached details
        ext = matchState.innings1Extras;
        runsCount = matchState.innings1Score;
        wicketsCount = matchState.innings1Wickets;
        ballsCount = matchState.innings1Balls;
    }
    
    const extTotal = ext.wd + ext.nb + ext.b + ext.lb;
    document.getElementById(extBreakId).innerText = `(wd ${ext.wd}, nb ${ext.nb}, b ${ext.b}, lb ${ext.lb})`;
    document.getElementById(extRowId).children[0].innerText = `Extras: ${extTotal}`;
    
    // Total Text
    document.getElementById(totalTextId).innerText = `Total: ${runsCount}/${wicketsCount} (${formatOvers(ballsCount)} Overs)`;
    
    // Fall of Wickets badges
    const fowData = matchState.fallOfWickets[innNum];
    if (fowData.length === 0) {
        fowDiv.innerHTML = `<span class="text-muted" style="font-size: 0.85rem;">No wickets fallen yet.</span>`;
    } else {
        fowData.forEach(item => {
            const badge = document.createElement("span");
            badge.className = "fow-badge";
            let nameDisp = item.batsmanOut;
            if (matchState.stats[nameDisp] && matchState.stats[nameDisp].isTwoSider) {
                nameDisp += " ↔️";
            }
            badge.innerText = `${item.wicketNumber}-${item.score} (${nameDisp}, ${item.over} ov)`;
            fowDiv.appendChild(badge);
        });
    }
    
    // Bowling Table
    // List only players who bowled at least 1 ball in this innings
    const activeBowlerInInn = (matchState.innings === innNum) ? matchState.currentBowlerName : "";
    
    let bowledList = bowlSquad.filter(name => {
        return matchState.stats[name].bowling.balls > 0 || name === activeBowlerInInn;
    });
    
    if (bowledList.length === 0) {
        bowlTbody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="text-muted">No bowling recorded yet.</td></tr>`;
    } else {
        bowledList.forEach(name => {
            const stats = matchState.stats[name].bowling;
            const econ = stats.balls ? (stats.runs / (stats.balls / 6)).toFixed(2) : "0.00";
            
            let dispName = name;
            if (matchState.stats[name] && matchState.stats[name].isTwoSider) {
                dispName += " ↔️";
            }
            
            const row = `
                <tr>
                    <td>${dispName}${name === activeBowlerInInn ? " 🔴 (Current)" : ""}</td>
                    <td>${formatOvers(stats.balls)}</td>
                    <td>${stats.maidens}</td>
                    <td>${stats.runs}</td>
                    <td>${stats.wickets}</td>
                    <td>${econ}</td>
                </tr>
            `;
            bowlTbody.innerHTML += row;
        });
    }
}

function renderTimelineTab() {
    const list = document.getElementById("timelineList");
    list.innerHTML = "";
    
    const activeTimeline = matchState.timeline[matchState.innings] || [];
    
    // Compile innings 1 and 2 timelines for display
    let fullTimeline = [];
    
    if (matchState.timeline[2] && matchState.timeline[2].length > 0) {
        fullTimeline.push({ isHeader: true, text: "2nd Innings History" });
        fullTimeline = fullTimeline.concat(matchState.timeline[2]);
    }
    
    if (matchState.timeline[1] && matchState.timeline[1].length > 0) {
        fullTimeline.push({ isHeader: true, text: "1st Innings History" });
        fullTimeline = fullTimeline.concat(matchState.timeline[1]);
    }
    
    if (fullTimeline.length === 0) {
        list.innerHTML = `<span class="text-muted" style="font-size: 0.95rem;">No balls recorded yet.</span>`;
        return;
    }
    
    fullTimeline.forEach(item => {
        if (item.isHeader) {
            const header = document.createElement("div");
            header.className = "setup-section-title";
            header.style.marginTop = "15px";
            header.innerText = item.text;
            list.appendChild(header);
            return;
        }
        
        const card = document.createElement("div");
        card.className = "timeline-card";
        
        let badgeClass = "ball-circle";
        if (item.badge === "0") badgeClass += " dot";
        else if (item.badge === "4") badgeClass += " four";
        else if (item.badge === "6") badgeClass += " six";
        else if (item.badge === "W") badgeClass += " wicket";
        else if (item.badge === "Wd" || item.badge === "Nb") badgeClass += " extra";
        
        card.innerHTML = `
            <div class="timeline-left">
                <span class="${badgeClass}" style="width: 30px; height: 30px; font-size: 0.75rem;">${item.badge}</span>
                <div>
                    <span class="timeline-over">${item.over}</span>
                    <span class="timeline-event" style="margin-left: 8px;">${item.event}</span>
                </div>
            </div>
            <div class="timeline-desc">${item.desc}</div>
        `;
        list.appendChild(card);
    });
}

function formatOvers(balls) {
    let ov = Math.floor(balls / 6);
    let bl = balls % 6;
    return `${ov}.${bl}`;
}

// --- ACTIVE PLAYER EDITING & REASSIGNMENT ---

let editRole = ""; // 'striker', 'nonStriker', 'bowler'

function openEditPlayerModal(role) {
    if (matchState.status !== "live") return;
    editRole = role;
    
    let currentName = "";
    if (role === "striker") currentName = matchState.strikerName;
    else if (role === "nonStriker") currentName = matchState.nonStrikerName;
    else if (role === "bowler") currentName = matchState.currentBowlerName;
    
    document.getElementById("editPlayerCurrentName").innerText = currentName;
    document.getElementById("editPlayerRenameInput").value = currentName;
    
    // Set two-sider checkbox status
    const isTwoSider = matchState.stats[currentName] && matchState.stats[currentName].isTwoSider || false;
    document.getElementById("editPlayerTwoSiderCheckbox").checked = isTwoSider;
    
    const select = document.getElementById("editPlayerReassignSelect");
    select.innerHTML = '<option value="">-- Keep current player --</option>';
    
    if (role === "striker" || role === "nonStriker") {
        const battingSquad = matchState.battingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
        // Filter out: other active batters, and players who are out
        const available = battingSquad.filter(name => {
            const isAtCrease = (name === matchState.strikerName || name === matchState.nonStrikerName);
            const isOut = matchState.stats[name].batting.dismissal !== "yet to bat" && 
                          matchState.stats[name].batting.dismissal !== "not out";
            return !isAtCrease && !isOut;
        });
        
        available.forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.text = name;
            select.appendChild(opt);
        });
    } else if (role === "bowler") {
        const bowlingSquad = matchState.bowlingTeam === 1 ? matchState.team1Squad : matchState.team2Squad;
        // Filter out active bowler
        const available = bowlingSquad.filter(name => name !== matchState.currentBowlerName);
        
        available.forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.text = name;
            select.appendChild(opt);
        });
    }
    
    document.getElementById("editPlayerModal").classList.add("active");
}

function closeEditPlayerModal() {
    document.getElementById("editPlayerModal").classList.remove("active");
}

function confirmEditPlayer() {
    const reassignName = document.getElementById("editPlayerReassignSelect").value;
    let renameName = document.getElementById("editPlayerRenameInput").value.trim();
    const isTwoSiderChecked = document.getElementById("editPlayerTwoSiderCheckbox").checked;
    
    if (!renameName) {
        alert("Player name cannot be empty.");
        return;
    }
    
    let currentName = "";
    if (editRole === "striker") currentName = matchState.strikerName;
    else if (editRole === "nonStriker") currentName = matchState.nonStrikerName;
    else if (editRole === "bowler") currentName = matchState.currentBowlerName;
    
    pushHistory();
    let changed = false;
    
    // Rename current player
    if (renameName !== currentName) {
        renamePlayer(currentName, renameName);
        currentName = renameName; // Update local tracker
        changed = true;
    }
    
    // Handle Two-Sider checkbox logic
    const wasTwoSider = matchState.stats[currentName] && matchState.stats[currentName].isTwoSider || false;
    if (isTwoSiderChecked !== wasTwoSider) {
        if (isTwoSiderChecked) {
            // Find which team the player belongs to
            const inT1 = matchState.team1Squad.includes(currentName);
            const inT2 = matchState.team2Squad.includes(currentName);
            
            let baseName = currentName.replace(" (T1)", "").replace(" (T2)", "");
            let t1Name = baseName + " (T1)";
            let t2Name = baseName + " (T2)";
            
            if (inT1 && !currentName.includes("(T1)")) {
                renamePlayer(currentName, t1Name);
                currentName = t1Name;
            } else if (inT2 && !currentName.includes("(T2)")) {
                renamePlayer(currentName, t2Name);
                currentName = t2Name;
            }
            
            // Mark as two-sider
            matchState.stats[currentName].isTwoSider = true;
            
            // Add to the other team's squad list as well!
            if (inT1) {
                if (!matchState.team2Squad.includes(t2Name)) {
                    matchState.team2Squad.push(t2Name);
                    // Initialize stats for the other team's version
                    matchState.stats[t2Name] = {
                        batting: { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "yet to bat" },
                        bowling: { balls: 0, maidens: 0, runs: 0, wickets: 0 },
                        isTwoSider: true
                    };
                }
            } else if (inT2) {
                if (!matchState.team1Squad.includes(t1Name)) {
                    matchState.team1Squad.push(t1Name);
                    // Initialize stats
                    matchState.stats[t1Name] = {
                        batting: { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "yet to bat" },
                        bowling: { balls: 0, maidens: 0, runs: 0, wickets: 0 },
                        isTwoSider: true
                    };
                }
            }
            
            alert(`Player "${baseName}" is now a Two-Sider!\nWe added "${t1Name}" to ${matchState.team1Name} and "${t2Name}" to ${matchState.team2Name} to track their stats separately in each innings.`);
        } else {
            // Uncheck: just set the flag to false
            if (matchState.stats[currentName]) {
                matchState.stats[currentName].isTwoSider = false;
            }
        }
        changed = true;
    }
    
    // Reassign crease position
    if (reassignName && reassignName !== currentName) {
        if (editRole === "striker") {
            matchState.strikerName = reassignName;
            matchState.stats[reassignName].batting.dismissal = "not out";
            if (!matchState.battingOrder[matchState.innings].includes(reassignName)) {
                matchState.battingOrder[matchState.innings].push(reassignName);
            }
        } else if (editRole === "nonStriker") {
            matchState.nonStrikerName = reassignName;
            matchState.stats[reassignName].batting.dismissal = "not out";
            if (!matchState.battingOrder[matchState.innings].includes(reassignName)) {
                matchState.battingOrder[matchState.innings].push(reassignName);
            }
        } else if (editRole === "bowler") {
            matchState.currentBowlerName = reassignName;
        }
        changed = true;
    }
    
    if (changed) {
        saveState();
        updateUI();
    }
    
    closeEditPlayerModal();
}

function renamePlayer(oldName, newName) {
    if (!newName || oldName === newName) return;
    
    // 1. Rename in squads
    let idx1 = matchState.team1Squad.indexOf(oldName);
    if (idx1 !== -1) matchState.team1Squad[idx1] = newName;
    
    let idx2 = matchState.team2Squad.indexOf(oldName);
    if (idx2 !== -1) matchState.team2Squad[idx2] = newName;
    
    // 2. Rename in stats object
    if (matchState.stats[oldName]) {
        matchState.stats[newName] = matchState.stats[oldName];
        delete matchState.stats[oldName];
    }
    
    // 3. Rename active variables
    if (matchState.strikerName === oldName) matchState.strikerName = newName;
    if (matchState.nonStrikerName === oldName) matchState.nonStrikerName = newName;
    if (matchState.currentBowlerName === oldName) matchState.currentBowlerName = newName;
    if (matchState.lastBowlerName === oldName) matchState.lastBowlerName = newName;
    if (matchState.innings1BowlerName === oldName) matchState.innings1BowlerName = newName;
    
    // 4. Rename in battingOrder
    [1, 2].forEach(inn => {
        if (matchState.battingOrder[inn]) {
            let idx = matchState.battingOrder[inn].indexOf(oldName);
            if (idx !== -1) matchState.battingOrder[inn][idx] = newName;
        }
    });
    
    // 5. Rename in Fall of Wickets
    [1, 2].forEach(inn => {
        if (matchState.fallOfWickets[inn]) {
            matchState.fallOfWickets[inn].forEach(item => {
                if (item.batsmanOut === oldName) item.batsmanOut = newName;
                if (item.bowler === oldName) item.bowler = newName;
            });
        }
    });
    
    // 6. Rename in timeline
    [1, 2].forEach(inn => {
        if (matchState.timeline[inn]) {
            matchState.timeline[inn].forEach(item => {
                if (item.event) item.event = item.event.split(oldName).join(newName);
                if (item.desc) item.desc = item.desc.split(oldName).join(newName);
            });
        }
    });
}

// --- PAST MATCHES SYSTEM ---

function initPastMatches() {
    renderPastMatches();
}

function saveCompletedMatch() {
    if (matchState.status !== "ended") return;
    
    let past = [];
    try {
        past = JSON.parse(localStorage.getItem("cricket_scorer_past_matches") || "[]");
    } catch (e) {
        past = [];
    }
    
    // Check if this match is already saved (to avoid duplicate saves)
    const exists = past.some(m => m.id === matchState.startTime);
    if (exists) return;
    
    let matchSummary = {
        id: matchState.startTime || Date.now(),
        date: matchState.matchDate || new Date().toLocaleString(),
        team1Name: matchState.team1Name,
        team2Name: matchState.team2Name,
        team1Score: matchState.innings1Score,
        team1Wickets: matchState.innings1Wickets,
        team1Balls: matchState.innings1Balls,
        team2Score: matchState.innings === 2 ? matchState.score : 0,
        team2Wickets: matchState.innings === 2 ? matchState.wickets : 0,
        team2Balls: matchState.innings === 2 ? matchState.balls : 0,
        winner: document.getElementById("matchWinnerMessage").innerText,
        fullState: JSON.parse(JSON.stringify(matchState))
    };
    
    past.push(matchSummary);
    localStorage.setItem("cricket_scorer_past_matches", JSON.stringify(past));
    renderPastMatches();
}

function renderPastMatches() {
    const pastCard = document.getElementById("pastMatchesCard");
    const list = document.getElementById("pastMatchesList");
    
    if (!pastCard || !list) return;
    
    let past = [];
    try {
        past = JSON.parse(localStorage.getItem("cricket_scorer_past_matches") || "[]");
    } catch (e) {
        past = [];
    }
    
    if (past.length === 0) {
        pastCard.style.display = "none";
        return;
    }
    
    pastCard.style.display = "block";
    list.innerHTML = "";
    
    // Show latest first
    const reversedPast = [...past].reverse();
    reversedPast.forEach(match => {
        const item = document.createElement("div");
        item.className = "timeline-card";
        item.style.background = "rgba(255,255,255,0.02)";
        item.style.border = "1px solid rgba(255,255,255,0.04)";
        item.style.flexDirection = "column";
        item.style.alignItems = "flex-start";
        item.style.gap = "8px";
        item.style.padding = "16px";
        
        let t1Overs = formatOvers(match.team1Balls);
        let t2Overs = formatOvers(match.team2Balls);
        
        item.innerHTML = `
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                <span style="font-weight: 700; color: var(--color-warning); font-size: 0.95rem;">🏏 ${match.team1Name} vs ${match.team2Name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${match.date}</span>
            </div>
            <div style="font-size: 0.9rem; margin-top: 4px; display: flex; flex-direction: column; gap: 4px; width: 100%;">
                <div>🏏 <strong>${match.team1Name}</strong>: ${match.team1Score}/${match.team1Wickets} (${t1Overs} Ov)</div>
                <div>🏏 <strong>${match.team2Name}</strong>: ${match.team2Score}/${match.team2Wickets} (${t2Overs} Ov)</div>
                <div style="color: var(--color-success); font-weight: 600; margin-top: 4px; font-size: 0.85rem;">🏆 Result: ${match.winner}</div>
            </div>
            <div style="width: 100%; display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                <button class="resume-btn secondary" onclick="deletePastMatch(${match.id})" style="padding: 6px 12px; font-size: 0.75rem; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.2); color: #fda4af; cursor: pointer; border-radius: 8px;">Delete</button>
                <button class="resume-btn primary" onclick="viewPastMatchScorecard(${match.id})" style="padding: 6px 12px; font-size: 0.75rem; cursor: pointer; border-radius: 8px;">View Scorecard</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function deletePastMatch(id) {
    if (!confirm("Are you sure you want to delete this match summary from history?")) return;
    
    let past = [];
    try {
        past = JSON.parse(localStorage.getItem("cricket_scorer_past_matches") || "[]");
    } catch (e) {
        past = [];
    }
    
    past = past.filter(m => m.id !== id);
    localStorage.setItem("cricket_scorer_past_matches", JSON.stringify(past));
    renderPastMatches();
}

function viewPastMatchScorecard(id) {
    let past = [];
    try {
        past = JSON.parse(localStorage.getItem("cricket_scorer_past_matches") || "[]");
    } catch (e) {
        past = [];
    }
    
    let match = past.find(m => m.id === id);
    if (!match) return;
    
    const state = match.fullState;
    
    const content = document.getElementById("pastScorecardContent");
    content.innerHTML = "";
    
    let inn1Html = generatePastInningsHtml(state, 1);
    let inn2Html = "";
    if (state.innings === 2 || state.status === "ended") {
        inn2Html = generatePastInningsHtml(state, 2);
    }
    
    let tossText = "";
    if (state.tossMethod === "skip") {
        tossText = `<div style="font-size: 0.85rem; color: var(--color-warning); margin-top: 6px;">Toss: Skipped (Direct Setup)</div>`;
    } else if (state.tossWinnerName && state.tossDecision) {
        const decisionStr = state.tossDecision === "bat" ? "elected to bat" : "elected to bowl";
        tossText = `<div style="font-size: 0.85rem; color: var(--color-warning); margin-top: 6px;">Toss: ${state.tossWinnerName} won and ${decisionStr} first</div>`;
    }
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 1.5rem; margin-bottom: 4px;">${state.team1Name} vs ${state.team2Name}</h2>
            <div class="match-status-badge">${match.winner}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Played on: ${match.date}</div>
            ${tossText}
        </div>
        ${inn1Html}
        ${inn2Html ? `<div style="margin-top: 30px;">${inn2Html}</div>` : ""}
    `;
    
    // Hook print button specifically for this past match
    document.getElementById("btnPrintPastScorecard").onclick = function() {
        let currentLiveState = JSON.parse(JSON.stringify(matchState));
        let currentLiveHistory = JSON.parse(JSON.stringify(matchHistory));
        let liveUIStatus = document.getElementById("scoreboard").style.display;
        let setupUIStatus = document.getElementById("setupScreen").style.display;
        
        // Temporarily set past state as live state
        matchState = state;
        
        // Hide setupscreen, show scoreboard, render scorecard tab
        document.getElementById("setupScreen").style.display = "none";
        document.getElementById("pastMatchesCard").style.display = "none";
        document.getElementById("scoreboard").style.display = "block";
        switchTab("scorecard");
        updateUI();
        
        // Print
        setTimeout(() => {
            window.print();
            
            // Restore live state & UI
            matchState = currentLiveState;
            matchHistory = currentLiveHistory;
            document.getElementById("scoreboard").style.display = liveUIStatus;
            document.getElementById("setupScreen").style.display = setupUIStatus;
            
            // Re-render
            updateUI();
            renderPastMatches();
        }, 100);
    };
    
    document.getElementById("pastScorecardModal").classList.add("active");
}

function closePastScorecardModal() {
    document.getElementById("pastScorecardModal").classList.remove("active");
}

function generatePastInningsHtml(state, innNum) {
    const inn1BatTeam = state.innings === 1 ? state.battingTeam : state.bowlingTeam;
    let batTeamName, bowlTeamName;
    if (innNum === 1) {
        batTeamName = inn1BatTeam === 1 ? state.team1Name : state.team2Name;
        bowlTeamName = inn1BatTeam === 1 ? state.team2Name : state.team1Name;
    } else {
        batTeamName = inn1BatTeam === 1 ? state.team2Name : state.team1Name;
        bowlTeamName = inn1BatTeam === 1 ? state.team1Name : state.team2Name;
    }
    
    const batSquad = innNum === 1 ? (inn1BatTeam === 1 ? state.team1Squad : state.team2Squad) : (inn1BatTeam === 1 ? state.team2Squad : state.team1Squad);
    const bowlSquad = innNum === 1 ? (inn1BatTeam === 1 ? state.team2Squad : state.team1Squad) : (inn1BatTeam === 1 ? state.team1Squad : state.team2Squad);
    
    const battedList = state.battingOrder[innNum] || [];
    const yetToBat = batSquad.filter(name => !battedList.includes(name));
    const fullOrder = [...battedList, ...yetToBat];
    
    let batRows = "";
    fullOrder.forEach(name => {
        const stats = state.stats[name].batting;
        const sr = stats.balls ? ((stats.runs / stats.balls) * 100).toFixed(2) : "0.00";
        batRows += `
            <tr>
                <td>${name}</td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${stats.dismissal}</td>
                <td>${stats.runs}</td>
                <td>${stats.balls}</td>
                <td>${stats.fours}</td>
                <td>${stats.sixes}</td>
                <td>${sr}</td>
            </tr>
        `;
    });
    
    let ext = (innNum === 1) ? state.innings1Extras : state.extras;
    if (innNum === 2 && state.innings === 1) {
        ext = { wd: 0, nb: 0, b: 0, lb: 0 };
    }
    const extTotal = ext.wd + ext.nb + ext.b + ext.lb;
    
    let runsCount = (innNum === 1) ? state.innings1Score : state.score;
    let wicketsCount = (innNum === 1) ? state.innings1Wickets : state.wickets;
    let ballsCount = (innNum === 1) ? state.innings1Balls : state.balls;
    if (state.innings === 1 && innNum === 2) {
        runsCount = 0; wicketsCount = 0; ballsCount = 0;
    }
    
    let fowHtml = "";
    const fowData = state.fallOfWickets[innNum] || [];
    if (fowData.length === 0) {
        fowHtml = `<span class="text-muted" style="font-size: 0.85rem;">No wickets fallen.</span>`;
    } else {
        fowData.forEach(item => {
            fowHtml += `<span class="fow-badge" style="margin-right: 8px; margin-bottom: 8px; display: inline-block;">${item.wicketNumber}-${item.score} (${item.batsmanOut}, ${item.over} ov)</span>`;
        });
    }
    
    let bowlRows = "";
    let bowledList = bowlSquad.filter(name => state.stats[name].bowling.balls > 0);
    if (bowledList.length === 0) {
        bowlRows = `<tr><td colspan="6" style="text-align: center;" class="text-muted">No bowling recorded.</td></tr>`;
    } else {
        bowledList.forEach(name => {
            const stats = state.stats[name].bowling;
            const econ = stats.balls ? (stats.runs / (stats.balls / 6)).toFixed(2) : "0.00";
            bowlRows += `
                <tr>
                    <td>${name}</td>
                    <td>${formatOvers(stats.balls)}</td>
                    <td>${stats.maidens}</td>
                    <td>${stats.runs}</td>
                    <td>${stats.wickets}</td>
                    <td>${econ}</td>
                </tr>
            `;
        });
    }
    
    return `
        <div class="stats-card" style="margin-bottom: 20px; border: 1px solid var(--border-color); border-radius: 20px; padding: 20px;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span>${batTeamName} Innings (${innNum === 1 ? "1st" : "2nd"} Innings)</span>
            </h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Batsman</th>
                            <th>Dismissal</th>
                            <th>Runs</th>
                            <th>Balls</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${batRows}
                    </tbody>
                </table>
            </div>
            <div class="scorecard-summary-row" style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 0.9rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05);">
                <span>Extras: ${extTotal}</span>
                <span>(wd ${ext.wd}, nb ${ext.nb}, b ${ext.b}, lb ${ext.lb})</span>
            </div>
            <div class="scorecard-summary-row" style="font-weight: 700; color: var(--text-main); border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                <span>Total: ${runsCount}/${wicketsCount} (${formatOvers(ballsCount)} Overs)</span>
            </div>
            
            <div class="setup-section-title" style="margin-top: 15px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Fall of Wickets</div>
            <div class="fow-list" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${fowHtml}
            </div>
            
            <div class="setup-section-title" style="margin-top: 20px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">Bowling</div>
            <div class="table-wrapper" style="margin-top: 8px;">
                <table>
                    <thead>
                        <tr>
                            <th>Bowler</th>
                            <th>Overs</th>
                            <th>Maidens</th>
                            <th>Runs</th>
                            <th>Wickets</th>
                            <th>Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bowlRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- CELEBRATION EFFECTS ---

function triggerCelebration(run) {
    const container = document.createElement("div");
    container.className = "celebration-container";
    document.body.appendChild(container);

    const card = document.createElement("div");
    card.className = `celebration-card ${run === 4 ? 'four-card' : 'six-card'}`;
    
    const titleText = run === 4 ? "🏏 FOUR! 🏏" : "🚀 SIX! 🚀";
    const descText = run === 4 ? "Beautiful Boundary! 🌟" : "Out of the Stadium! 🌌";
    
    card.innerHTML = `
        <div class="celebration-title">${titleText}</div>
        <div class="celebration-subtitle">${descText}</div>
    `;
    container.appendChild(card);

    const colors = ["#fbbf24", "#34d399", "#f87171", "#60a5fa", "#a78bfa", "#f472b6"];
    
    // Top raining confetti
    const topConfettiCount = 50;
    for (let i = 0; i < topConfettiCount; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle";
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 1.5 + Math.random() * 1.5;
        const size = 6 + Math.random() * 8;
        const isCircle = Math.random() > 0.5;

        particle.style.backgroundColor = color;
        particle.style.left = `${left}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        if (isCircle) {
            particle.style.borderRadius = "50%";
        }
        
        particle.style.setProperty("--x-end", `${-150 + Math.random() * 300}px`);
        particle.style.setProperty("--rotation", `${360 + Math.random() * 720}deg`);

        container.appendChild(particle);
    }

    // Bottom-left corner burst
    const leftBurstCount = 30;
    for (let i = 0; i < leftBurstCount; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle burst";
        particle.style.left = "0px";
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.2;
        const duration = 1.2 + Math.random() * 0.8;
        const size = 8 + Math.random() * 10;
        const isCircle = Math.random() > 0.5;

        particle.style.backgroundColor = color;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        if (isCircle) {
            particle.style.borderRadius = "50%";
        }
        
        const xEnd = 150 + Math.random() * 350;
        const yEnd = -(300 + Math.random() * 450);
        particle.style.setProperty("--x-end", `${xEnd}px`);
        particle.style.setProperty("--y-end", `${yEnd}px`);
        particle.style.setProperty("--rotation", `${360 + Math.random() * 720}deg`);

        container.appendChild(particle);
    }

    // Bottom-right corner burst
    const rightBurstCount = 30;
    for (let i = 0; i < rightBurstCount; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle burst";
        particle.style.right = "0px";
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.2;
        const duration = 1.2 + Math.random() * 0.8;
        const size = 8 + Math.random() * 10;
        const isCircle = Math.random() > 0.5;

        particle.style.backgroundColor = color;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        if (isCircle) {
            particle.style.borderRadius = "50%";
        }
        
        const xEnd = -(150 + Math.random() * 350);
        const yEnd = -(300 + Math.random() * 450);
        particle.style.setProperty("--x-end", `${xEnd}px`);
        particle.style.setProperty("--y-end", `${yEnd}px`);
        particle.style.setProperty("--rotation", `${360 + Math.random() * 720}deg`);

        container.appendChild(particle);
    }

    // Fade and clean up
    setTimeout(() => {
        container.classList.add("fade-out");
        setTimeout(() => {
            container.remove();
        }, 500);
    }, 2200);
}