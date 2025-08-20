const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const size = canvas.width; // 480
const N = 8;
const S = size / N; // square size
let board = []; // 8x8
let selected = null; // {r,c}
let legalMoves = [];
let turn = 'w'; // 'w' or 'b'
const turnText = document.getElementById('turnText');
const statusEl = document.getElementById('status');
let gameOver = false;
let whitePlayerName = 'Player 1';
let blackPlayerName = 'Computer';
// Two player mode

// Timer variables
let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600; // 10 minutes in seconds
let timerInterval = null;
let currentPlayer = 'w';
let gameTimeLimit = 600; // Default 10 minutes

// Chess piece images (using lichess pieces)
const PIECE_IMAGES = {
  pw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
  nw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
  bw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
  rw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
  qw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
  kw: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  pb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
  nb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
  bb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
  rb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
  qb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
  kb: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png'
};

// Cache for loaded images
const pieceImages = {};

// Function to load all piece images
function loadPieceImages() {
  return Promise.all(
    Object.entries(PIECE_IMAGES).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          pieceImages[key] = img;
          resolve();
        };
        // If image fails to load, use a fallback color
        img.onerror = () => {
          console.warn(`Failed to load piece image: ${key}`);
          pieceImages[key] = null;
          resolve();
        };
      });
    })
  );
}

function updateTimerDisplay() {
  const formatTime = (seconds) => {
    if (gameTimeLimit === 0) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const whiteTimer = document.getElementById('whiteTimer');
  const blackTimer = document.getElementById('blackTimer');
  
  whiteTimer.textContent = formatTime(whiteTime);
  blackTimer.textContent = formatTime(blackTime);
  
  turnText.textContent = `Turn: ${turn === 'w' ? whitePlayerName + ' (White)' : blackPlayerName + ' (Black)'}`;
  
  // Highlight active player's timer
  if (currentPlayer === 'w') {
    whiteTimer.classList.add('active-timer');
    blackTimer.classList.remove('active-timer');
  } else {
    whiteTimer.classList.remove('active-timer');
    blackTimer.classList.add('active-timer');
  }
}

function startTimer() {
  // Update timer display immediately when switching turns
  updateTimerDisplay();
  
  // Clear any existing timer
  if (timerInterval) clearInterval(timerInterval);
  
  // Start the timer
  timerInterval = setInterval(() => {
    if (gameOver) {
      clearInterval(timerInterval);
      return;
    }
    
    if (currentPlayer === 'w') {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        gameOver = true;
        clearInterval(timerInterval);
        statusEl.textContent = 'Time out! Black wins!';
        showWinnerPopup('Black');
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        gameOver = true;
        clearInterval(timerInterval);
        statusEl.textContent = 'Time out! White wins!';
        showWinnerPopup('White');
      }
    }
    
    updateTimerDisplay();
  }, 1000);
}

function makeEmptyBoard() {
  const b = Array.from({length:N}, () => Array(N).fill(null));
  return b;
}

function setupStartingPosition() {
  board = makeEmptyBoard();
  const back = ['r','n','b','q','k','b','n','r'];
  // black
  for(let c=0;c<8;c++) board[0][c] = {type:back[c], color:'b'};
  for(let c=0;c<8;c++) board[1][c] = {type:'p', color:'b'};
  // white
  for(let c=0;c<8;c++) board[6][c] = {type:'p', color:'w'};
  for(let c=0;c<8;c++) board[7][c] = {type:back[c], color:'w'};
  turn = 'w';
  currentPlayer = 'w';
  turnText.textContent = `${whitePlayerName}'s turn (White)`;
  selected = null; legalMoves = []; gameOver = false; statusEl.textContent = '';
  
  // Reset timer highlights
  updateTimerDisplay();
  
  // Reset timers based on selected time control
  const timeControl = document.querySelector('input[name="timeControl"]:checked').value;
  gameTimeLimit = parseInt(timeControl, 10) * 60 || 0; // in seconds
  
  if (gameTimeLimit > 0) {
    whiteTime = gameTimeLimit;
    blackTime = gameTimeLimit;
    updateTimerDisplay();
    startTimer();
    document.getElementById('timerDisplay').style.display = 'flex';
  } else {
    document.getElementById('timerDisplay').style.display = 'none';
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
}

function drawBoard() {
  // Modern chess board with glowing effect
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const light = (r + c) % 2 === 0;
      const gradient = ctx.createLinearGradient(c*S, r*S, (c+1)*S, (r+1)*S);
      
      if(light) {
        gradient.addColorStop(0, '#f0d9b5');
        gradient.addColorStop(1, '#e6c88a');
      } else {
        gradient.addColorStop(0, '#b58863');
        gradient.addColorStop(1, '#a67b5b');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(c*S, r*S, S, S);
    }
  }
  // highlight selected square with animation
  if(selected){
    const time = Date.now() / 200; // For animation
    const pulse = Math.abs(Math.sin(time)) * 0.5 + 0.5; // 0 to 1
    
    // Subtle glow effect for selected piece
    const gradient = ctx.createRadialGradient(
      selected.c*S + S/2, selected.r*S + S/2, S*0.1,
      selected.c*S + S/2, selected.r*S + S/2, S*0.8
    );
    
    gradient.addColorStop(0, `rgba(100, 149, 237, ${0.3 + pulse * 0.2})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(selected.c*S, selected.r*S, S, S);
    
    // Subtle border
    ctx.strokeStyle = `rgba(65, 105, 225, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 1.5 + pulse * 1.5;
    ctx.shadowColor = '#4169e1';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeRect(selected.c*S + 2, selected.r*S + 2, S-4, S-4);
  }
  // Animated legal moves
  const time = Date.now() / 300; // For animation
  
  for(const mv of legalMoves){
    const {r,c,cap} = mv;
    const pulse = Math.abs(Math.sin(time + r + c)) * 0.5 + 0.5; // Unique pulse per square
    
    if(cap){
      // Animated capture indicator
      ctx.beginPath();
      const radius = S * (0.25 + pulse * 0.1);
      const gradient = ctx.createRadialGradient(
        c*S + S/2, r*S + S/2, 0,
        c*S + S/2, r*S + S/2, radius * 1.5
      );
      
      gradient.addColorStop(0, `rgba(255, 0, 255, ${0.7 + pulse * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.arc(c*S + S/2, r*S + S/2, radius * 1.5, 0, Math.PI*2);
      ctx.fill();
      
      // Glowing outer ring
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 0, 255, ${0.8 + pulse * 0.2})`;
      ctx.lineWidth = 2 + pulse;
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 10;
      ctx.arc(c*S + S/2, r*S + S/2, radius * 1.8, 0, Math.PI*2);
      ctx.stroke();
    } else {
      // Glowing move indicator
      ctx.beginPath();
      const radius = S * (0.06 + pulse * 0.04);
      ctx.fillStyle = `rgba(100, 200, 255, ${0.3 + pulse * 0.2})`;
      ctx.arc(c*S + S/2, r*S + S/2, radius, 0, Math.PI*2);
      ctx.fill();
      
      // Pulsing dot in the center
      ctx.beginPath();
      ctx.fillStyle = `rgba(70, 130, 255, ${0.7 + pulse * 0.2})`;
      ctx.shadowColor = '#4682ff';
      ctx.shadowBlur = 5;
      ctx.arc(c*S + S/2, r*S + S/2, radius * 0.6, 0, Math.PI*2);
      ctx.fill();
    }
  }
  // pieces with glow
  ctx.textAlign = 'center'; 
  ctx.textBaseline = 'middle';
  // Draw pieces
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const piece = board[r][c];
      if(!piece) continue;
      
      const key = piece.type + piece.color;
      const img = pieceImages[key];
      
      if (img) {
        // Draw image with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Calculate size and position to center the image in the square
        const imgSize = S * 0.9; // Slightly smaller than the square
        const offset = (S - imgSize) / 2;
        
        ctx.drawImage(
          img,
          c*S + offset,
          r*S + offset,
          imgSize,
          imgSize
        );
        ctx.restore();
      } else {
        // Fallback to text if image fails to load
        ctx.save();
        ctx.font = `${S * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if(piece.color === 'w') {
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
        } else {
          ctx.fillStyle = '#333';
          ctx.shadowColor = 'rgba(255,255,255,0.3)';
        }
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Fallback to basic piece representation
        const pieceMap = {
          'p': piece.color === 'w' ? '♙' : '♟',
          'n': piece.color === 'w' ? '♘' : '♞',
          'b': piece.color === 'w' ? '♗' : '♝',
          'r': piece.color === 'w' ? '♖' : '♜',
          'q': piece.color === 'w' ? '♕' : '♛',
          'k': piece.color === 'w' ? '♔' : '♚'
        };
        
        ctx.fillText(pieceMap[piece.type] || '', c*S + S/2, r*S + S/2);
        ctx.restore();
      }
    }
  }

  // Subtle red highlight for king in check
  const wk = findKing('w');
  const bk = findKing('b');
  
  // Reset shadow for king highlight
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  
  function drawCheckEffect(king, isWhite) {
    if (!king) return;
    
    const {r, c} = king;
    const gradient = ctx.createRadialGradient(
      c*S + S/2, r*S + S/2, S*0.1,
      c*S + S/2, r*S + S/2, S*0.8
    );
    
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    // Glow effect
    ctx.fillStyle = gradient;
    ctx.fillRect(c*S, r*S, S, S);
    
    // Subtle pulsing border for check
    const pulse = Math.abs(Math.sin(Date.now() / 400)) * 0.4 + 0.6;
    ctx.strokeStyle = `rgba(220, 20, 60, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 2 + pulse * 1.5;
    ctx.shadowColor = '#dc143c';
    ctx.shadowBlur = 15;
    ctx.strokeRect(c*S + 2, r*S + 2, S-4, S-4);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }
  
  if(wk && isSquareAttacked(wk.r, wk.c, 'b')) drawCheckEffect(wk, true);
  if(bk && isSquareAttacked(bk.r, bk.c, 'w')) drawCheckEffect(bk, false);

  updateStatus();
}

// Helpers
function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8 }

function getPiece(r,c){ if(!inBounds(r,c)) return null; return board[r][c]; }

function isEmpty(r,c){ return inBounds(r,c) && board[r][c]===null }

function isEnemy(r,c,color){ const p = getPiece(r,c); return p && p.color !== color }

function findKing(color){ for(let r=0;r<8;r++) for(let c=0;c<8;c++){ const p = board[r][c]; if(p && p.type==='k' && p.color===color) return {r,c}; } return null; }

// check if square r,c is attacked by any piece of byColor (used for check detection)
function isSquareAttacked(r,c, byColor){
  if(!inBounds(r,c)) return false;
  // pawns
  if(byColor === 'w'){
    if(inBounds(r+1,c-1) && getPiece(r+1,c-1)?.type === 'p' && getPiece(r+1,c-1)?.color === 'w') return true;
    if(inBounds(r+1,c+1) && getPiece(r+1,c+1)?.type === 'p' && getPiece(r+1,c+1)?.color === 'w') return true;
  } else {
    if(inBounds(r-1,c-1) && getPiece(r-1,c-1)?.type === 'p' && getPiece(r-1,c-1)?.color === 'b') return true;
    if(inBounds(r-1,c+1) && getPiece(r-1,c+1)?.type === 'p' && getPiece(r-1,c+1)?.color === 'b') return true;
  }
  // knights
  const deltasN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const [dr,dc] of deltasN){ const rr=r+dr, cc=c+dc; if(inBounds(rr,cc)){ const p = getPiece(rr,cc); if(p && p.type==='n' && p.color===byColor) return true; }}
  // bishops/queens (diagonals)
  const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for(const [dr,dc] of diag){ let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){ const p = getPiece(rr,cc); if(p){ if(p.color===byColor && (p.type==='b' || p.type==='q')) return true; break; } rr+=dr; cc+=dc; }}
  // rooks/queens (orthogonal)
  const orth = [[-1,0],[1,0],[0,-1],[0,1]];
  for(const [dr,dc] of orth){ let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){ const p = getPiece(rr,cc); if(p){ if(p.color===byColor && (p.type==='r' || p.type==='q')) return true; break; } rr+=dr; cc+=dc; }}
  // king (adjacent)
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0 && dc===0) continue; const rr=r+dr, cc=c+dc; if(inBounds(rr,cc)){ const p = getPiece(rr,cc); if(p && p.type==='k' && p.color===byColor) return true; }}
  return false;
}

function simulateMoveLeavesKingInCheck(r1,c1,r2,c2, color){
  const src = board[r1][c1];
  const dst = board[r2][c2];
  if(!src) return true; // illegal
  // handle promotion simulation
  const promoted = (src.type==='p') && ((src.color==='w' && r2===0) || (src.color==='b' && r2===7));
  // make move
  board[r2][c2] = src;
  board[r1][c1] = null;
  if(promoted) board[r2][c2] = {type:'q', color: src.color};
  // find king position for 'color'
  let kingPos = findKing(color);
  if(!kingPos){
    kingPos = {r:r2,c:c2};
  }
  // if we moved the king, update
  if(src.type==='k') kingPos = {r:r2,c:c2};
  const opponent = color === 'w' ? 'b' : 'w';
  const inCheck = isSquareAttacked(kingPos.r, kingPos.c, opponent);
  // undo
  board[r1][c1] = src;
  board[r2][c2] = dst;
  return inCheck;
}

function getPseudoMovesFor(r,c){
  const p = getPiece(r,c);
  if(!p) return [];
  const moves = [];
  const color = p.color;
  const dir = color === 'w' ? -1 : 1;
  if(p.type === 'p'){
    // forward
    if(isEmpty(r+dir, c)) moves.push({r:r+dir,c,cap:false});
    // double from start
    const startRow = color==='w' ? 6 : 1;
    if(r===startRow && isEmpty(r+dir,c) && isEmpty(r+2*dir,c)) moves.push({r:r+2*dir,c,cap:false});
    // captures
    for(const dc of [-1,1]){
      if(isEnemy(r+dir,c+dc,color)) moves.push({r:r+dir,c:c+dc,cap:true});
    }
  }
  else if(p.type === 'n'){
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr,dc] of deltas){ const rr=r+dr, cc=c+dc; if(inBounds(rr,cc) && (!getPiece(rr,cc) || isEnemy(rr,cc,color))) moves.push({r:rr,c:cc,cap:!!getPiece(rr,cc)}); }
  }
  else if(p.type === 'b' || p.type === 'r' || p.type === 'q'){
    const dirs = [];
    if(p.type==='b' || p.type==='q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if(p.type==='r' || p.type==='q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    for(const [dr,dc] of dirs){
      let rr=r+dr, cc=c+dc;
      while(inBounds(rr,cc)){
        const occ = getPiece(rr,cc);
        if(!occ) moves.push({r:rr,c:cc,cap:false});
        else { if(occ.color!==color) moves.push({r:rr,c:cc,cap:true}); break; }
        rr += dr; cc += dc;
      }
    }
  }
  else if(p.type === 'k'){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0 && dc===0) continue; const rr=r+dr, cc=c+dc; if(inBounds(rr,cc) && (!getPiece(rr,cc) || isEnemy(rr,cc,color))) moves.push({r:rr,c:cc,cap:!!getPiece(rr,cc)}); }
  }
  return moves;
}

function getLegalMovesFor(r,c){
  const p = getPiece(r,c);
  if(!p) return [];
  const pseudo = getPseudoMovesFor(r,c);
  const legal = [];
  for(const mv of pseudo){
    if(!simulateMoveLeavesKingInCheck(r,c,mv.r,mv.c,p.color)) legal.push(mv);
  }
  return legal;
}

function hasAnyLegalMoves(color){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = getPiece(r,c);
      if(p && p.color === color){
        const moves = getLegalMovesFor(r,c);
        if(moves.length>0) return true;
      }
    }
  }
  return false;
}

function coordsFromMouse(evt){
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const c = Math.floor(x / S);
  const r = Math.floor(y / S);
  return {r,c};
}

function handleClick(e){
  if(gameOver) return;

  // Play click sound
  const clickSound = document.getElementById('clickSound');
  clickSound.currentTime = 0; // Rewind to start if already playing
  clickSound.volume = 0.3; // 30% volume
  clickSound.play().catch(e => console.log('Could not play click sound'));

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

}

// Handle both touch and mouse events
function handleInteraction(clientX, clientY) {
  if (gameOver) return;

  const pos = getCanvasPosition(clientX, clientY);
  const c = Math.floor(pos.x / S);
  const r = Math.floor(pos.y / S);

  // If a square is already selected and the user clicks on a legal move
  if (selected) {
    const move = legalMoves.find(m => m.to.r === r && m.to.c === c);
    if (move) {
      makeMove(move);
      selected = null;
      legalMoves = [];
      drawBoard();
      return;
    }
  }

  // Select a piece
  if (r >= 0 && r < 8 && c >= 0 && c < 8) {
    const piece = board[r][c];
    if (piece && piece.color === turn) {
      selected = { r, c };
      legalMoves = getLegalMoves(r, c);
      drawBoard();
    }
  } else {
    selected = null;
    legalMoves = [];
    drawBoard();
  }
}

// Mouse events
canvas.addEventListener('click', (e) => {
  if(gameOver) return;
  handleInteraction(e.clientX, e.clientY);
});

// ...

function movePiece(r1,c1,r2,c2){
  const p = board[r1][c1];
  if(!p) return;
  // simple capture/move
  const captured = board[r2][c2];
  // handle promotion
  const willPromote = (p.type==='p') && ((p.color==='w' && r2===0) || (p.color==='b' && r2===7));
  board[r2][c2] = p;
  board[r1][c1] = null;
  if(willPromote) board[r2][c2].type = 'q';

  // Switch the active timer if time control is enabled
  if (gameTimeLimit > 0) {
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    startTimer();
  }

  // Play move sound
  const moveSound = document.getElementById('moveSound');
  moveSound.currentTime = 0; // Rewind to start if already playing
  moveSound.volume = 0.5; // 50% volume
  moveSound.play().catch(e => console.log('Could not play move sound'));

  // Update turn display with player names
  turnText.textContent = `${turn === 'w' ? blackPlayerName : whitePlayerName}'s turn (${turn === 'w' ? 'Black' : 'White'})`;

  // after move, check for check/checkmate/stalemate
  const movedColor = p.color;
  const opponent = movedColor === 'w' ? 'b' : 'w';
  // find opponent king
  const oppKing = findKing(opponent);
  let opponentInCheck = false;
  if(oppKing) opponentInCheck = isSquareAttacked(oppKing.r, oppKing.c, movedColor);

  // switch turn
  turn = opponent;
  turnText.textContent = turn === 'w' ? 'White' : 'Black';

  if(opponentInCheck){
    if(!hasAnyLegalMoves(opponent)){
      statusEl.textContent = `Checkmate! ${movedColor === 'w' ? 'White' : 'Black'} wins.`;
      showWinnerPopup(movedColor === 'w' ? 'White' : 'Black');
      gameOver = true;
    } else {
      statusEl.textContent = `${opponent === 'w' ? 'White' : 'Black'} is in check.`;
    }
  } else {
    // not in check
    if(!hasAnyLegalMoves(opponent)){
      statusEl.textContent = 'Stalemate.';
      showWinnerPopup('Draw');
      gameOver = true;
    } else {
      statusEl.textContent = '';
    }
  }
}

function updateStatus(){
  if(gameOver) return;
  const myKing = findKing(turn);
  if(myKing && isSquareAttacked(myKing.r, myKing.c, turn === 'w' ? 'b' : 'w')){
    statusEl.textContent = `${turn === 'w' ? whitePlayerName : blackPlayerName} is in check!`;
  } else {
    statusEl.textContent = '';
  }
}

function showWinnerPopup(winner) {
  const popup = document.getElementById('winnerPopup');
  const winnerText = document.getElementById('winnerText');

  if (winner === 'Draw') {
    winnerText.textContent = 'The game is a draw!';
  } else {
    const winnerName = winner === 'White' ? whitePlayerName : blackPlayerName;
    winnerText.textContent = `${winnerName} (${winner}) wins the game!`;
    // Play clap sound for a win
    const clapSound = document.getElementById('clapSound');
    clapSound.currentTime = 0; // Rewind to start if already playing
    clapSound.volume = 0.7; // 70% volume
    clapSound.play().catch(e => console.log('Could not play clap sound'));
  }

  // Trigger reflow to ensure the animation works
  void popup.offsetWidth;
  popup.classList.add('show');
}

window.addEventListener('click', (e) => {
  const popup = document.getElementById('winnerPopup');
  if (e.target === popup) {
    popup.classList.remove('show');
  }
});

function closeWinnerPopup() {
  const popup = document.getElementById('winnerPopup');
  popup.classList.remove('show');
  // Small delay to allow the popup to fade out before restarting
  setTimeout(() => {
    setupStartingPosition();
    drawBoard();
  }, 300);
}

// Two player mode - no computer opponent

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  // Initialize timer display
  updateTimerDisplay();

  // Handle player name input
  const startButton = document.getElementById('startGame');
  startButton.addEventListener('click', () => {
    whitePlayerName = document.getElementById('whitePlayer').value || 'Player 1';
    blackPlayerName = document.getElementById('blackPlayer').value || 'Player 2';
    
    // Get selected time limit
    const timeLimit = parseInt(document.querySelector('input[name="timeControl"]:checked').value) * 60;
    gameTimeLimit = timeLimit;
    whiteTime = timeLimit || 99999; // Very high number for no time limit
    blackTime = timeLimit || 99999;

    // Update displayed names
    document.getElementById('whiteName').textContent = whitePlayerName;
    document.getElementById('blackName').textContent = blackPlayerName;

    // Hide modal and show game
    document.getElementById('playerModal').style.display = 'none';
    const container = document.querySelector('.container');
    container.style.display = 'block';
    
    // Show/hide timer based on selection
    document.getElementById('timerDisplay').style.display = timeLimit > 0 ? 'flex' : 'none';

    // Start the game
    setupStartingPosition();
    drawBoard();
    
    // Start the timer if time limit is set
    if (timeLimit > 0) {
      startTimer();
    }
  });

  // Restart button
  document.getElementById('restart').addEventListener('click', () => { 
    setupStartingPosition(); 
    drawBoard(); 
  });

  // Play move sound when a move is made
  canvas.addEventListener('click', (e) => {
    if(gameOver) return;
    const {r,c} = coordsFromMouse(e);
    if(!inBounds(r,c)) return;
    const p = getPiece(r,c);

    if(selected){
      // If clicked on a legal move
      const match = legalMoves.find(m => m.r===r && m.c===c);
      if(match){
        movePiece(selected.r, selected.c, r, c);
        selected = null; 
        legalMoves = [];
        drawBoard();
        return;
      }
    }
    
    if(p && p.color === turn){
      selected = {r,c};
      legalMoves = getLegalMovesFor(r,c);
    } else {
      selected = null; 
      legalMoves = [];
    }
    drawBoard();
  });
});






















