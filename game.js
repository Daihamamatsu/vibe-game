// Updated game.js with character movement, obstacles, and collision detection

// --- Three.js setup ------------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Player ---------------------------------------------------------------
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.5, 0);
scene.add(player);

// --- Obstacles ------------------------------------------------------------
const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const obstacles = [];
const obstaclePositions = [
  { x: 3, y: 0.5, z: 0 },
  { x: -3, y: 0.5, z: 0 },
  { x: 0, y: 0.5, z: 3 },
  { x: 0, y: 0.5, z: -3 },
];
obstaclePositions.forEach(pos => {
  const obs = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obs.position.set(pos.x, pos.y, pos.z);
  scene.add(obs);
  obstacles.push(obs);
});

// --- Camera ---------------------------------------------------------------
camera.position.set(0, 5, 10);
camera.lookAt(player.position);

// --- Movement handling -----------------------------------------------------
const moveSpeed = 0.1;
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
window.addEventListener('keyup', e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// --- Collision detection ---------------------------------------------------
function checkCollision(newPos) {
  const playerBox = new THREE.Box3().setFromObject(player);
  const tempBox = new THREE.Box3().setFromObject(player.clone());
  tempBox.translate(newPos.clone().sub(player.position));
  for (const obs of obstacles) {
    const obsBox = new THREE.Box3().setFromObject(obs);
    if (tempBox.intersectsBox(obsBox)) return true;
  }
  return false;
}

// --- Animation loop --------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const dir = new THREE.Vector3();
  if (keys.ArrowUp) dir.z -= 1;
  if (keys.ArrowDown) dir.z += 1;
  if (keys.ArrowLeft) dir.x -= 1;
  if (keys.ArrowRight) dir.x += 1;
  if (dir.lengthSq() > 0) {
    dir.normalize();
    const move = dir.clone().multiplyScalar(moveSpeed);
    if (!checkCollision(move)) {
      player.position.add(move);
    }
  }

  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 10;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

animate();
