class MahjongGame {
    constructor() {
        this.tiles = [];
        this.selectedTile = null;
        this.gameBoard = document.getElementById('gameBoard');
        this.timerElement = document.getElementById('timer');
        this.newGameButton = document.getElementById('newGame');
        this.shuffleButton = document.getElementById('shuffleButton');
        this.victoryModal = document.getElementById('victoryModal');
        this.completionTimeElement = document.getElementById('completionTime');
        this.shuffleCountElement = document.getElementById('shuffleCount');
        this.playAgainButton = document.getElementById('playAgain');
        
        this.startTime = null;
        this.timerInterval = null;
        this.gameStarted = false;
        this.shuffleCount = 0;
        
        // Sound-related properties
        this.audioEnabled = true;
        this.audioContext = null;
        this.lastMatchTime = 0;
        this.consecutiveMatches = 0;
        this.currentVolume = 0.6;
        
        // Initialize audio with proper error handling
        this.initAudio();
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initAudio() {
        try {
            // Create an AudioContext - this works more reliably in Chrome
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Use a simple oscillator-based sound that will definitely work
            this.createSimpleSound = () => {
                // Check if audio context is in suspended state (Chrome's autoplay policy)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // Create a click sound (short percussive sound)
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // Use a noise-like waveform for click
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // Lower frequency for click
                
                // Configure volume - very short attack and decay for click sound
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.currentVolume || 0.6, this.audioContext.currentTime + 0.001); // Fast attack
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08); // Quick decay
                
                // Connect nodes
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Start and stop - shorter duration for click
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.08);
                
                console.log("Playing click sound");
            };
            
            // Initialize audio context on first user interaction
            const initOnInteraction = () => {
                // Resume audio context (needed for Chrome)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log("AudioContext resumed successfully");
                    }).catch(e => {
                        console.error("Failed to resume AudioContext:", e);
                    });
                }
                
                // Play a silent sound to initialize audio
                const silentOscillator = this.audioContext.createOscillator();
                const silentGain = this.audioContext.createGain();
                silentGain.gain.setValueAtTime(0, this.audioContext.currentTime); // Silent
                silentOscillator.connect(silentGain);
                silentGain.connect(this.audioContext.destination);
                silentOscillator.start();
                silentOscillator.stop(this.audioContext.currentTime + 0.001);
                
                console.log("Audio system initialized on user interaction");
                
                // Remove event listeners once initialized
                document.removeEventListener('click', initOnInteraction);
                document.removeEventListener('touchstart', initOnInteraction);
                document.removeEventListener('keydown', initOnInteraction);
            };
            
            // Add event listeners for user interaction
            document.addEventListener('click', initOnInteraction);
            document.addEventListener('touchstart', initOnInteraction);
            document.addEventListener('keydown', initOnInteraction);
            
            this.audioEnabled = true;
            console.log("Audio system set up successfully");
            
        } catch (error) {
            console.error("Audio initialization failed:", error);
            this.audioEnabled = false;
        }
    }

    initializeGame() {
        // Create tiles
        this.tiles = [];
        
        // Reset shuffle count
        this.shuffleCount = 0;
        
        // Define colors for numbers 1-8
        const numberColors = {
            1: '#FF8A8A', // Lighter Red
            2: '#FFBD59', // Lighter Orange
            3: '#FFF176', // Lighter Yellow
            4: '#81C784', // Lighter Green
            5: '#64B5F6', // Lighter Blue
            6: '#9575CD', // Lighter Purple
            7: '#F48FB1', // Lighter Pink
            8: '#A1887F'  // Lighter Brown
        };
        
        // Add number tiles (1-8), two pairs of each number (4 total)
        for (let i = 1; i <= 8; i++) {
            // First pair
            this.tiles.push({ type: 'number', value: i, color: numberColors[i], layer: 'bottom', matched: false });
            this.tiles.push({ type: 'number', value: i, color: numberColors[i], layer: 'bottom', matched: false });
            // Second pair
            this.tiles.push({ type: 'number', value: i, color: numberColors[i], layer: 'bottom', matched: false });
            this.tiles.push({ type: 'number', value: i, color: numberColors[i], layer: 'bottom', matched: false });
        }
        
        // Add letter tiles (A-P), one pair of each
        const letters = 'ABCDEFGHIJKLMNOP';
        const letterColors = {
            A: '#FF8A8A', // Lighter Red (same as 1)
            B: '#FFBD59', // Lighter Orange (same as 2)
            C: '#FFF176', // Lighter Yellow (same as 3)
            D: '#81C784', // Lighter Green (same as 4)
            E: '#64B5F6', // Lighter Blue (same as 5)
            F: '#9575CD', // Lighter Purple (same as 6)
            G: '#F48FB1', // Lighter Pink (same as 7)
            H: '#A1887F', // Lighter Brown (same as 8)
            I: '#F06292', // Lighter Pink-red
            J: '#BA68C8', // Lighter Purple
            K: '#7986CB', // Lighter Indigo
            L: '#4DB6AC', // Lighter Teal
            M: '#FFD54F', // Lighter Amber
            N: '#AED581', // Lighter Light Green
            O: '#90A4AE', // Lighter Blue Gray
            P: '#BDBDBD'  // Lighter Gray
        };
        
        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i];
            this.tiles.push({ type: 'letter', value: letter, color: letterColors[letter], layer: 'bottom', matched: false });
            this.tiles.push({ type: 'letter', value: letter, color: letterColors[letter], layer: 'bottom', matched: false });
        }

        // Shuffle tiles
        this.shuffleTiles();
        
        // Move some tiles to top layer
        const topLayerIndices = new Set();
        while (topLayerIndices.size < 36) { // 6x6 = 36 tiles
            const randomIndex = Math.floor(Math.random() * this.tiles.length);
            if (!topLayerIndices.has(randomIndex)) {
                this.tiles[randomIndex].layer = 'top';
                topLayerIndices.add(randomIndex);
            }
        }
        
        // Render tiles
        this.renderTiles();
        
        // Reset timer
        this.resetTimer();
        
        // Hide victory modal
        this.victoryModal.classList.remove('show');
    }

    shuffleTiles() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    renderTiles() {
        this.gameBoard.innerHTML = '';
        this.tiles.forEach((tile, index) => {
            const tileElement = document.createElement('div');
            tileElement.className = `tile ${tile.type} ${tile.layer}-layer`;
            tileElement.dataset.index = index;
            
            // Set the tile value
            tileElement.textContent = tile.value;
            
            // Apply custom color to number and letter tiles
            if (tile.color) {
                tileElement.style.backgroundColor = tile.color;
                tileElement.style.color = '#fff'; // White text for better contrast
                tileElement.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            }
            
            // Calculate position based on layer and index
            if (tile.layer === 'bottom') {
                const row = Math.floor(index / 8) % 8; // Ensure we stay within 0-7
                const col = index % 8;
                tileElement.style.left = `${col * 75}px`;
                tileElement.style.top = `${row * 75}px`;
            } else {
                // For top layer, position them with a shift to create the layered effect
                const topIndex = this.getTileTopIndex(index);
                const row = Math.floor(topIndex / 6);
                const col = topIndex % 6;
                tileElement.style.left = `${(col * 75) + 75}px`; // Offset by 75px
                tileElement.style.top = `${(row * 75) + 75}px`;  // Offset by 75px
            }
            
            // If tile is matched, hide it
            if (tile.matched) {
                tileElement.classList.add('matched');
            }
            
            this.gameBoard.appendChild(tileElement);
        });
        
        // Update visibility of tiles
        this.updateTileVisibility();
    }

    getTileTopIndex(index) {
        // Find how many top layer tiles come before this one
        let topCount = 0;
        for (let i = 0; i < index; i++) {
            if (this.tiles[i].layer === 'top' && !this.tiles[i].matched) {
                topCount++;
            }
        }
        return topCount;
    }

    updateTileVisibility() {
        console.log("Updating visibility...");
        
        // First, remove all hidden classes
        this.tiles.forEach((tile, index) => {
            if (!tile.matched) {
                const tileElement = this.gameBoard.children[index];
                tileElement.classList.remove('hidden');
                tileElement.classList.remove('blocked');
            }
        });
        
        // Then, check which bottom tiles should be hidden
        this.tiles.forEach((tile, index) => {
            if (tile.matched) return; // Skip matched tiles
            
            const tileElement = this.gameBoard.children[index];
            if (tile.layer === 'bottom') {
                // Get the position of this bottom tile
                const style = window.getComputedStyle(tileElement);
                const left = parseInt(style.left);
                const top = parseInt(style.top);
                
                // Check if any unmatched top layer tile overlaps this position
                const isCovered = this.isPositionCovered(left, top);
                if (isCovered) {
                    tileElement.classList.add('hidden');
                    console.log(`Tile ${index} is covered and hidden`);
                } else {
                    console.log(`Tile ${index} is visible`);
                }
            }
        });
        
        // Check which tiles are blocked (don't have at least one open side)
        this.tiles.forEach((tile, index) => {
            if (tile.matched) return; // Skip matched tiles
            
            const tileElement = this.gameBoard.children[index];
            if (!tileElement.classList.contains('hidden')) {
                // Only check visible tiles
                if (!this.hasOpenSide(index)) {
                    tileElement.classList.add('blocked');
                    console.log(`Tile ${index} is blocked (doesn't have an open side)`);
                }
            }
        });
        
        // Log the current state for debugging
        let visibleCount = 0;
        let hiddenCount = 0;
        let blockedCount = 0;
        let matchedCount = 0;
        
        this.tiles.forEach((tile, index) => {
            if (tile.matched) {
                matchedCount++;
            } else {
                const tileElement = this.gameBoard.children[index];
                if (tileElement.classList.contains('hidden')) {
                    hiddenCount++;
                } else if (tileElement.classList.contains('blocked')) {
                    blockedCount++;
                } else {
                    visibleCount++;
                }
            }
        });
        
        console.log(`Visible & Playable: ${visibleCount}, Hidden: ${hiddenCount}, Blocked: ${blockedCount}, Matched: ${matchedCount}`);
    }

    isPositionCovered(left, top) {
        // Check if any unmatched top layer tile covers this position
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            if (tile.layer === 'top' && !tile.matched) {
                const tileElement = this.gameBoard.children[i];
                const style = window.getComputedStyle(tileElement);
                const tileLeft = parseInt(style.left);
                const tileTop = parseInt(style.top);
                
                // Check if the tiles overlap - they must occupy the exact same position
                if (Math.abs(left - tileLeft) < 5 && Math.abs(top - tileTop) < 5) {
                    return true;
                }
            }
        }
        return false;
    }

    hasOpenSide(index) {
        const tileElement = this.gameBoard.children[index];
        const style = window.getComputedStyle(tileElement);
        const left = parseInt(style.left);
        const top = parseInt(style.top);
        
        // Check all four sides: top, right, bottom, left
        const sides = [
            {dx: 0, dy: -75}, // top
            {dx: 75, dy: 0},  // right
            {dx: 0, dy: 75},  // bottom
            {dx: -75, dy: 0}  // left
        ];
        
        let openSides = 0;
        sides.forEach(side => {
            const adjacentLeft = left + side.dx;
            const adjacentTop = top + side.dy;
            
            // Check if this side is open (no other visible tile)
            const hasAdjacentTile = this.hasAdjacentTile(adjacentLeft, adjacentTop);
            if (!hasAdjacentTile) {
                openSides++;
            }
        });
        
        return openSides >= 1;
    }
    
    hasAdjacentTile(left, top) {
        // Check if there's a visible, unmatched tile at this position
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.tiles[i].matched) continue;
            
            const tileElement = this.gameBoard.children[i];
            if (tileElement.classList.contains('hidden')) continue;
            
            const style = window.getComputedStyle(tileElement);
            const tileLeft = parseInt(style.left);
            const tileTop = parseInt(style.top);
            
            if (Math.abs(tileLeft - left) < 5 && Math.abs(tileTop - top) < 5) {
                return true;
            }
        }
        return false;
    }

    setupEventListeners() {
        this.gameBoard.addEventListener('click', (e) => {
            const tileElement = e.target.closest('.tile');
            if (!tileElement) return;
            
            const index = parseInt(tileElement.dataset.index);
            this.handleTileClick(index);
        });

        this.newGameButton.addEventListener('click', () => {
            this.initializeGame();
        });

        this.shuffleButton.addEventListener('click', () => {
            this.shuffleVisibleTiles();
        });

        this.playAgainButton.addEventListener('click', () => {
            this.initializeGame();
        });
    }

    handleTileClick(index) {
        const tile = this.tiles[index];
        const tileElement = this.gameBoard.children[index];
        
        console.log(`Clicked tile ${index}: ${tile.type} ${tile.value}, layer: ${tile.layer}, matched: ${tile.matched}, hidden: ${tileElement.classList.contains('hidden')}`);
        
        // Skip if tile is matched, hidden, or blocked (doesn't have an open side)
        if (tile.matched || 
            tileElement.classList.contains('hidden') || 
            tileElement.classList.contains('blocked')) {
            console.log(`Tile ${index} is matched, hidden, or blocked, ignoring click`);
            return;
        }
        
        // Start timer on first click
        this.startTimer();
        
        if (this.selectedTile === null) {
            this.selectedTile = { index, tile };
            tileElement.classList.add('selected');
            console.log(`Selected first tile ${index}: ${tile.type} ${tile.value}`);
        } else {
            const selectedElement = this.gameBoard.children[this.selectedTile.index];
            
            if (this.selectedTile.index === index) {
                // Clicking the same tile
                console.log(`Deselecting tile ${index}`);
                selectedElement.classList.remove('selected');
                this.selectedTile = null;
            } else if (this.isMatch(this.selectedTile.tile, tile)) {
                // Match found
                console.log(`Match found between tile ${this.selectedTile.index} and ${index}`);
                tileElement.classList.add('selected');
                
                // Store the indices to avoid closure issues
                const currentIndex = index;
                const selectedIndex = this.selectedTile.index;
                
                setTimeout(() => {
                    // Get the elements again in case DOM has changed
                    const currentElement = this.gameBoard.children[currentIndex];
                    const selectedElement = this.gameBoard.children[selectedIndex];
                    
                    if (currentElement && selectedElement) {
                        console.log(`Marking tiles ${selectedIndex} and ${currentIndex} as matched`);
                        currentElement.classList.remove('selected');
                        selectedElement.classList.remove('selected');
                        currentElement.classList.add('matched');
                        selectedElement.classList.add('matched');
                        
                        // Mark tiles as matched in the data structure
                        this.tiles[currentIndex].matched = true;
                        this.tiles[selectedIndex].matched = true;
                        
                        // Play match sound with crescendo
                        this.playMatchSound();
                        
                        // Update visibility after removing matched tiles
                        this.updateTileVisibility();
                        
                        // Check if game is complete
                        if (this.isGameComplete()) {
                            setTimeout(() => {
                                this.showVictoryModal();
                            }, 500);
                        }
                    }
                }, 500);
            } else {
                // No match
                console.log(`No match between tile ${this.selectedTile.index} and ${index}`);
                tileElement.classList.add('selected');
                setTimeout(() => {
                    tileElement.classList.remove('selected');
                    selectedElement.classList.remove('selected');
                }, 500);
            }
            
            this.selectedTile = null;
        }
    }

    isMatch(tile1, tile2) {
        // Check if both tiles are of the same type and value and not already matched
        return tile1.type === tile2.type && 
               tile1.value === tile2.value && 
               !tile1.matched && 
               !tile2.matched;
    }

    isGameComplete() {
        // Check if all tiles are matched
        return this.tiles.every(tile => tile.matched);
    }

    resetTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.startTime = null;
        this.gameStarted = false;
        this.timerElement.textContent = '00:00';
    }

    startTimer() {
        if (!this.gameStarted) {
            this.startTime = Date.now();
            this.gameStarted = true;
            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
    }

    shuffleVisibleTiles() {
        if (!this.gameStarted) return; // Only allow shuffling after game has started
        
        // Increment shuffle count
        this.shuffleCount++;
        
        // Get all unmatched tiles
        const unmatchedTiles = this.tiles.filter(tile => !tile.matched);
        
        // Shuffle only the unmatched tiles
        for (let i = unmatchedTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            
            // Find the indices of these tiles in the original array
            const indexI = this.tiles.indexOf(unmatchedTiles[i]);
            const indexJ = this.tiles.indexOf(unmatchedTiles[j]);
            
            // Swap the layer property
            [this.tiles[indexI].layer, this.tiles[indexJ].layer] = 
            [this.tiles[indexJ].layer, this.tiles[indexI].layer];
        }
        
        // Deselect any selected tile
        if (this.selectedTile) {
            const selectedElement = this.gameBoard.children[this.selectedTile.index];
            if (selectedElement) {
                selectedElement.classList.remove('selected');
            }
            this.selectedTile = null;
        }
        
        // Re-render tiles
        this.renderTiles();
    }

    showVictoryModal() {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        this.completionTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.shuffleCountElement.textContent = this.shuffleCount;
        
        // Show modal with animation
        this.victoryModal.classList.add('show');
    }

    playMatchSound() {
        if (!this.audioEnabled || !this.audioContext) {
            console.log("Audio is not enabled or initialized");
            return;
        }
        
        const now = Date.now();
        const timeSinceLastMatch = now - this.lastMatchTime;
        
        // Check if match happened within 3 seconds of the last match
        if (timeSinceLastMatch < 3000) {
            // Increase consecutive match counter (max 5 for volume control)
            this.consecutiveMatches = Math.min(this.consecutiveMatches + 1, 5);
        } else {
            // Reset counter if more than 3 seconds since last match
            this.consecutiveMatches = 0;
        }
        
        // Update the last match time
        this.lastMatchTime = now;
        
        // Adjust volume based on consecutive matches (0.6 - 1.0)
        const baseVolume = 0.6;
        const volumeIncrement = 0.08; // Each match increases volume by 8%
        this.currentVolume = Math.min(baseVolume + (this.consecutiveMatches * volumeIncrement), 1.0);
        
        // Play the simple sound
        try {
            this.createSimpleSound();
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new MahjongGame();
}); 