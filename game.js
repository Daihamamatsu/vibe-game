// Updated game.js with corrected collision detection

// --- Three.js setup --------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Player (ブロック風ヒューマノイド) ------------------------------------------------
// 外部モデルを使わず、箱のプリミティブを組み合わせる(単位: 世界座標)
const player = new THREE.Group();

// 頭(肌色)
const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshBasicMaterial({ color: 0xffcc99 })
);
head.position.set(0, 1.3, 0);
player.add(head);

// 胴体(青いシャツ)
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.6, 0.3),
  new THREE.MeshBasicMaterial({ color: 0x2266cc })
);
body.position.set(0, 0.8, 0);
player.add(body);

// 左腕(肌色)
const leftArm = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.6, 0.15),
  new THREE.MeshBasicMaterial({ color: 0xffcc99 })
);
leftArm.position.set(-0.35, 0.8, 0);
player.add(leftArm);

// 右腕(肌色)
const rightArm = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.6, 0.15),
  new THREE.MeshBasicMaterial({ color: 0xffcc99 })
);
rightArm.position.set(0.35, 0.8, 0);
player.add(rightArm);

// 左脚(濃紺のズボン)
const leftLeg = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.5, 0.18),
  new THREE.MeshBasicMaterial({ color: 0x333366 })
);
leftLeg.position.set(-0.14, 0.25, 0);
player.add(leftLeg);

// 右脚(濃紺のズボン)
const rightLeg = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.5, 0.18),
  new THREE.MeshBasicMaterial({ color: 0x333366 })
);
rightLeg.position.set(0.14, 0.25, 0);
player.add(rightLeg);

// グループの原点を足元に置く(従来: y=0.5 の中心)
player.position.set(0, 0, 0);
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
// 足元ではなく体中心(y+0.8)を向く
camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);

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
function checkCollision(move) {
  // Current bounding box of the player
  const playerBox = new THREE.Box3().setFromObject(player);
  // Bounding box at the position after applying the move
  const tempBox = new THREE.Box3().setFromObject(player.clone());
  tempBox.translate(move); // Move the temporary box by the intended displacement
  for (const obs of obstacles) {
    const obsBox = new THREE.Box3().setFromObject(obs);
    if (tempBox.intersectsBox(obsBox)) return true;
  }
  return false;
}

// --- Animation loop -------------------------------------------------------
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
  // 体中心(y+0.8)を向く
  camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);

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
