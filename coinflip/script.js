let isBetPlaced = false;
let canContinue = false;
let betAmount = 0.1;
let lockedBetAmount = null;
let multiplier = 0;
let seriesCounter = 0;
let isSideChosen = false;
let selectedCurrency = "SOL";
let isCurrencyLocked = false;
let walletAddress = null;
let walletBalance = 0;
let walletBalanceRAPR = 0;

const NODE_URL = "https://tiniest-shy-water.solana-mainnet.quiknode.pro/f7dcf6f0e8f6ed9593e82aedd5bc7bf05654c30e";
const RAPR_TOKEN_ACCOUNT = "RAPRz9fd87y9qcBGj1VVqUbbUM6DaBggSDA58zc3N2b";

function updateBetAmount() {
    if (lockedBetAmount !== null) {
        document.getElementById("result").textContent = `Bet is locked at ${lockedBetAmount} ${selectedCurrency}. Cash out or reset to change.`;
        return;
    }
    const betInput = document.getElementById("bet-amount");
    betAmount = parseFloat(betInput.value) || 0;
}

function setBetAmount(amount) {
    if (lockedBetAmount !== null) {
        document.getElementById("result").textContent = `Bet is locked at ${lockedBetAmount} ${selectedCurrency}. Cash out or reset to change.`;
        return;
    }
    betAmount = amount;
    const betInput = document.getElementById("bet-amount");
    betInput.value = amount;
}

function lockBetAmount() {
    lockedBetAmount = betAmount;
    const betInput = document.getElementById("bet-amount");
    const betButtons = document.querySelectorAll(".bet-buttons button");
    
    betInput.disabled = true;
    betButtons.forEach((button) => {
        button.disabled = true;
    });
}

function unlockBetAmount() {
    lockedBetAmount = null;
    const betInput = document.getElementById("bet-amount");
    const betButtons = document.querySelectorAll(".bet-buttons button");
    
    betInput.disabled = false;
    betButtons.forEach((button) => {
        button.disabled = false;
    });
}

function lockCurrencySwitching() {
    isCurrencyLocked = true;
    document.getElementById("currency-sol").disabled = true;
    document.getElementById("currency-rapr").disabled = true;
}

function unlockCurrencySwitching() {
    isCurrencyLocked = false;
    document.getElementById("currency-sol").disabled = false;
    document.getElementById("currency-rapr").disabled = false;
}

function switchCurrency(currency) {
    if (isCurrencyLocked) {
        document.getElementById("result").textContent = "Cannot switch currency during an active game!";
        return;
    }

    selectedCurrency = currency;
    document.getElementById("currency-sol").classList.toggle("active", currency === "SOL");
    document.getElementById("currency-rapr").classList.toggle("active", currency === "RAPR");

    if (currency === "SOL") {
        fetchWalletBalance();
    } else if (currency === "RAPR") {
        fetchRAPRBalance();
    }
}

function updateMultiplier(reset = false) {
    const multiplierValue = document.getElementById("multiplier-value");

    if (reset) {
        multiplier = 0;
        multiplierValue.textContent = `${multiplier}x`;
        return;
    }

    multiplier = multiplier === 0 ? 1.98 : multiplier * 2;
    multiplierValue.textContent = `${multiplier.toFixed(2)}x`;
}

function placeBet() {
    const betBtn = document.getElementById("bet-btn");
    
    // Prevent clicking if bet is already placed
    if (betBtn.classList.contains("picking-side") || isBetPlaced) {
        return;
    }

    const betInput = document.getElementById("bet-amount");
    if (!betInput.value || parseFloat(betInput.value) <= 0) {
        document.getElementById("result").textContent = "Please enter a valid bet amount!";
        return;
    }

    // First disable the buttons
    disableButtons();

    // Enable and show Patco/Matco buttons
    const patcoBtn = document.getElementById("heads-btn");
    const matcoBtn = document.getElementById("tails-btn");
    patcoBtn.disabled = false;
    matcoBtn.disabled = false;
    patcoBtn.classList.add("active");
    matcoBtn.classList.add("active");

    // Hide bet button and show picking side state
    betBtn.classList.add("picking-side");
    betBtn.textContent = "Picking Side...";
    betBtn.disabled = true;  // Actually disable the button

    // Hide cash out button and amount
    const cashOutBtn = document.getElementById("cash-out-btn");
    cashOutBtn.style.display = "none";
    document.getElementById("cash-out-amount").textContent = "";

    // Stop any ongoing animations
    const coin = document.getElementById("coin");
    coin.classList.remove("spin-yellow", "spin-red");

    // Lock currency switching and bet amount
    lockCurrencySwitching();
    if (lockedBetAmount === null) {
        lockBetAmount();
    }

    // Reset game state
    multiplier = 0;
    seriesCounter = 0;
    document.getElementById("multiplier-value").textContent = `${multiplier}x`;
    document.getElementById("series-value").textContent = seriesCounter;

    // Reset coin and cashout display
    coin.style.display = "block";
    const cashoutDisplay = document.getElementById("cashout-display");
    cashoutDisplay.classList.remove("visible");

    isBetPlaced = true;
    canContinue = false;
    isSideChosen = false;

    document.getElementById("result").textContent = `Bet placed: ${betAmount} ${selectedCurrency}. Pick Patco or Matco!`;
}

function selectSide(choice) {
    const patcoBtn = document.getElementById("heads-btn");
    const matcoBtn = document.getElementById("tails-btn");
    const cashOutBtn = document.getElementById("cash-out-btn");
    
    if (patcoBtn.disabled || matcoBtn.disabled) {
        return;
    }

    if (!isBetPlaced && !canContinue) {
        document.getElementById("result").textContent = "Please press 'Bet' first!";
        return;
    }

    if (isSideChosen) {
        document.getElementById("result").textContent = "Wait for the coin to stop spinning!";
        return;
    }

    const coin = document.getElementById("coin");
    coin.classList.remove("spin-yellow", "spin-red");
    void coin.offsetWidth;

    const options = ["hlava", "orel"];
    const randomIndex = Math.floor(Math.random() * options.length);
    const coinResult = options[randomIndex];

    // Disable all interactive buttons during spin
    patcoBtn.disabled = true;
    matcoBtn.disabled = true;
    patcoBtn.classList.remove("active");
    matcoBtn.classList.remove("active");
    if (cashOutBtn) {
        cashOutBtn.disabled = true;
        cashOutBtn.classList.add("spinning");  // Add spinning class
    }

    isSideChosen = true;

    if (coinResult === "hlava") {
        coin.classList.add("spin-yellow");
    } else {
        coin.classList.add("spin-red");
    }

    setTimeout(() => {
        if (choice === coinResult) {
            handleWin(coinResult);
            if (cashOutBtn) {
                cashOutBtn.disabled = false;
                cashOutBtn.classList.remove("spinning");  // Remove spinning class
            }
        } else {
            handleLoss(coinResult);
        }

        if (!canContinue) {
            disableButtons();
        }

        isBetPlaced = canContinue;
        isSideChosen = false;
    }, 3000);
}

    setTimeout(() => {
        if (choice === coinResult) {
            handleWin(coinResult);
            if (cashOutBtn) {
                cashOutBtn.disabled = false;  // Re-enable cash out on win
            }
        } else {
            handleLoss(coinResult);
        }

        if (!canContinue) {
            disableButtons();
        }

        isBetPlaced = canContinue;
        isSideChosen = false;
    }, 3000);


function handleWin(coinResult) {
    winSound.currentTime = 0;
    winSound.play();
    
    updateMultiplier();
    seriesCounter++;
    document.getElementById("series-value").textContent = seriesCounter;
    
    const winnings = (betAmount * multiplier).toFixed(2);
    document.getElementById("result").textContent = `Result: ${coinResult === 'hlava' ? 'PATCO' : 'MATCO'}. You won ${betAmount} ${selectedCurrency}!`;
    
    // Show cash out button and hide bet button
    const betBtn = document.getElementById("bet-btn");
    const cashOutBtn = document.getElementById("cash-out-btn");
    betBtn.style.display = "none";
    cashOutBtn.style.display = "block";
    cashOutBtn.classList.remove("disabled");
    
    // Update cash out amount
    document.getElementById("cash-out-amount").style.display = "block";  // Added this line
    document.getElementById("cash-out-amount").textContent = `${winnings} ${selectedCurrency}`;
    
    // Re-enable side selection buttons
    const patcoBtn = document.getElementById("heads-btn");
    const matcoBtn = document.getElementById("tails-btn");
    patcoBtn.disabled = false;
    matcoBtn.disabled = false;
    
    canContinue = true;
}

function handleLoss(coinResult) {
    lossSound.currentTime = 0;
    lossSound.play();
    
    document.getElementById("result").textContent = `Result: ${coinResult === 'hlava' ? 'PATCO' : 'MATCO'}. You lost ${betAmount} ${selectedCurrency}.`;
    updateMultiplier(true);
    seriesCounter = 0;
    document.getElementById("series-value").textContent = seriesCounter;

    // Clear cash out amount
    document.getElementById("cash-out-amount").textContent = "";

    resetGameState();
}

function cashOut() {
    const cashOutBtn = document.getElementById("cash-out-btn");
    
    // Prevent clicking during spins
    if (isSideChosen || cashOutBtn.disabled) {
        return;
    }

    const winnings = (betAmount * multiplier).toFixed(2);
    
    cashoutSound.currentTime = 0;
    cashoutSound.play();
    
    document.getElementById("result").textContent = `You cashed out with ${parseFloat(winnings).toFixed(3)} ${selectedCurrency}!`;
    
    const cashoutDisplay = document.getElementById("cashout-display");
    const coin = document.getElementById("coin");
    
    document.getElementById("cashout-multiplier").textContent = `${multiplier.toFixed(2)}x`;
    document.getElementById("cashout-profit").textContent = `${parseFloat(winnings).toFixed(3)} ${selectedCurrency}`;
    
    document.getElementById("cash-out-amount").style.display = "none";
    
    coin.style.display = "none";
    cashoutDisplay.classList.add("visible");
    
    resetGameState();
}
function resetGameState() {
    // Reset buttons
    const betBtn = document.getElementById("bet-btn");
    const cashOutBtn = document.getElementById("cash-out-btn");
    betBtn.style.display = "block";
    betBtn.classList.remove("picking-side");
    betBtn.classList.remove("disabled");
    betBtn.disabled = false;  // Enable the bet button again
    betBtn.textContent = "Bet";
    cashOutBtn.style.display = "none";
    
    // Reset game elements
    disableButtons();
    unlockBetAmount();
    unlockCurrencySwitching();
    
    // Reset states
    isBetPlaced = false;
    canContinue = false;
    isSideChosen = false;
    
    // Clear cash out amount
    document.getElementById("cash-out-amount").textContent = "";
}

function doubleBetAmount() {
    if (lockedBetAmount !== null) {
        document.getElementById("result").textContent = `Bet is locked at ${lockedBetAmount} ${selectedCurrency}. Cash out or reset to change.`;
        return;
    }

    const betInput = document.getElementById("bet-amount");
    const currentBet = parseFloat(betInput.value) || 0;
    const doubledBet = currentBet * 2;

    betInput.value = doubledBet.toFixed(2);
    betAmount = doubledBet;
}

function halveBetAmount() {
    if (lockedBetAmount !== null) {
        document.getElementById("result").textContent = `Bet is locked at ${lockedBetAmount} ${selectedCurrency}. Cash out or reset to change.`;
        return;
    }

    const betInput = document.getElementById("bet-amount");
    const currentBet = parseFloat(betInput.value) || 0;
    const halvedBet = currentBet / 2;

    betInput.value = halvedBet.toFixed(2);
    betAmount = halvedBet;
}

function disableButtons() {
    const headsBtn = document.getElementById("heads-btn");
    const tailsBtn = document.getElementById("tails-btn");
    headsBtn.disabled = true;
    tailsBtn.disabled = true;
    headsBtn.classList.remove("active");
    tailsBtn.classList.remove("active");
}

async function connectWallet() {
    const errorDiv = document.getElementById("error");
    try {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error("Phantom Wallet not found! Please install it from https://phantom.app/");
        }

        const response = await window.solana.connect();
        walletAddress = response.publicKey.toString();
        
        // Update button text with shortened address
        const connectButton = document.getElementById("connect-wallet-btn");
        connectButton.textContent = shortenAddress(walletAddress);
        
        if (selectedCurrency === "SOL") {
            await fetchWalletBalance();
        } else {
            await fetchRAPRBalance();
        }
    } catch (err) {
        console.error("Failed to connect wallet:", err.message);
        errorDiv.textContent = `Error: ${err.message}`;
        setTimeout(() => (errorDiv.textContent = ""), 5000);
    }
}

async function fetchWalletBalance() {
    const errorDiv = document.getElementById("error");
    try {
        const connection = new solanaWeb3.Connection(NODE_URL, "confirmed");
        const publicKey = new solanaWeb3.PublicKey(walletAddress);

        const lamports = await connection.getBalance(publicKey);
        walletBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
        document.getElementById("wallet-balance").textContent = `Balance: ${walletBalance.toFixed(3)} SOL`;

        connection.onAccountChange(publicKey, (updatedAccountInfo) => {
            const updatedLamports = updatedAccountInfo.lamports;
            const updatedBalance = updatedLamports / solanaWeb3.LAMPORTS_PER_SOL;
            walletBalance = updatedBalance;
            document.getElementById("wallet-balance").textContent = `Balance: ${updatedBalance.toFixed(3)} SOL`;
        });
    } catch (err) {
        console.error("Failed to fetch wallet balance:", err.message);
        errorDiv.textContent = `Error: ${err.message}`;
        setTimeout(() => (errorDiv.textContent = ""), 5000);
    }
}

async function fetchRAPRBalance() {
    const errorDiv = document.getElementById("error");
    try {
        const connection = new solanaWeb3.Connection(NODE_URL, "confirmed");
        const tokenMint = new solanaWeb3.PublicKey(RAPR_TOKEN_ACCOUNT);
        
        if (!walletAddress) {
            document.getElementById("wallet-balance").textContent = "Balance: Not Connected";
            return;
        }
        
        const publicKey = new solanaWeb3.PublicKey(walletAddress);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: tokenMint
        });

        if (tokenAccounts.value.length > 0) {
            const raprBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            walletBalanceRAPR = raprBalance;
            document.getElementById("wallet-balance").textContent = `Balance: ${raprBalance.toFixed(3)} RAPR`;
        } else {
            walletBalanceRAPR = 0;
            document.getElementById("wallet-balance").textContent = "Balance: 0 RAPR";
        }
    } catch (err) {
        console.error("Failed to fetch RAPR balance:", err.message);
        errorDiv.textContent = `Error: ${err.message}`;
        setTimeout(() => (errorDiv.textContent = ""), 5000);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connect-wallet-btn");
    if (connectButton) {
        connectButton.addEventListener("click", connectWallet);
    } else {
        console.error("Connect Wallet button not found.");
    }
});

const winSound = document.getElementById("win-sound");
const lossSound = document.getElementById("loss-sound");
const cashoutSound = document.getElementById("cashout-sound");

function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}