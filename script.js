class MahjongGame {
    constructor() {
        this.tiles = [];
        this.selectedTile = null;
        this.gameBoard = document.getElementById('gameBoard');
        this.timerElement = document.getElementById('timer');
        this.newGameButton = document.getElementById('newGame');
        this.victoryModal = document.getElementById('victoryModal');
        this.completionTimeElement = document.getElementById('completionTime');
        this.playAgainButton = document.getElementById('playAgain');
        
        this.startTime = null;
        this.timerInterval = null;
        this.gameStarted = false;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        // Create tiles
        this.tiles = [];
        
        // Add character tiles (1-8)
        for (let i = 1; i <= 8; i++) {
            this.tiles.push({ type: 'character', value: i });
            this.tiles.push({ type: 'character', value: i });
        }
        
        // Add bamboo tiles (1-8)
        for (let i = 1; i <= 8; i++) {
            this.tiles.push({ type: 'bamboo', value: i });
            this.tiles.push({ type: 'bamboo', value: i });
        }
        
        // Add circle tiles (1-8)
        for (let i = 1; i <= 8; i++) {
            this.tiles.push({ type: 'circle', value: i });
            this.tiles.push({ type: 'circle', value: i });
        }
        
        // Add wind tiles (East, South, West, North)
        const winds = ['East', 'South', 'West', 'North'];
        winds.forEach(wind => {
            this.tiles.push({ type: 'wind', value: wind });
            this.tiles.push({ type: 'wind', value: wind });
        });
        
        // Add dragon tiles (Red, Green, White, Gold) - one pair of each
        const dragons = ['Red', 'Green', 'White', 'Gold'];
        dragons.forEach(dragon => {
            this.tiles.push({ type: 'dragon', value: dragon });
            this.tiles.push({ type: 'dragon', value: dragon });
        });

        // Shuffle tiles
        this.shuffleTiles();
        
        // Render tiles
        this.renderTiles();
        
        // Reset timer
        this.resetTimer();
        
        // Hide victory modal
        this.victoryModal.classList.remove('show');
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

    showVictoryModal() {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        this.completionTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Show modal with animation
        this.victoryModal.classList.add('show');
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
            tileElement.className = `tile ${tile.type}`;
            tileElement.dataset.index = index;
            
            // Set tile content based on type
            if (tile.type === 'character' || tile.type === 'bamboo' || tile.type === 'circle') {
                tileElement.textContent = tile.value;
            } else if (tile.type === 'wind') {
                tileElement.textContent = tile.value[0];
            } else if (tile.type === 'dragon') {
                tileElement.textContent = tile.value[0];
            }
            
            this.gameBoard.appendChild(tileElement);
        });
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

        this.playAgainButton.addEventListener('click', () => {
            this.initializeGame();
        });
    }

    handleTileClick(index) {
        const tile = this.tiles[index];
        const tileElement = this.gameBoard.children[index];
        
        if (tileElement.classList.contains('matched')) return;
        
        // Start timer on first click
        this.startTimer();
        
        if (this.selectedTile === null) {
            this.selectedTile = { index, tile };
            tileElement.classList.add('selected');
        } else {
            const selectedElement = this.gameBoard.children[this.selectedTile.index];
            
            if (this.selectedTile.index === index) {
                // Clicking the same tile
                selectedElement.classList.remove('selected');
                this.selectedTile = null;
            } else if (this.isMatch(this.selectedTile.tile, tile)) {
                // Match found
                tileElement.classList.add('selected');
                setTimeout(() => {
                    tileElement.classList.remove('selected');
                    selectedElement.classList.remove('selected');
                    tileElement.classList.add('matched');
                    selectedElement.classList.add('matched');
                    
                    // Check if game is complete
                    if (this.isGameComplete()) {
                        setTimeout(() => {
                            this.showVictoryModal();
                        }, 500);
                    }
                }, 500);
            } else {
                // No match
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
        return tile1.type === tile2.type && tile1.value === tile2.value;
    }

    isGameComplete() {
        return this.tiles.every((tile, index) => 
            this.gameBoard.children[index].classList.contains('matched')
        );
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new MahjongGame();
}); 