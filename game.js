// Updated game.js with corrected collision detection

// --- Three.js setup --------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Player (ブロック風ヒューマノイド) ------------------------------------------------
// 外部モデルを使わず、箱のプリミティブを組み合わせる(単位: 世界座標)
// モデルの前面(顔)はローカル座標 +Z 方向を向いている
const player = new THREE.Group();

// 頭(肌色)
const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshBasicMaterial({ color: 0xffcc99 })
);
head.position.set(0, 1.3, 0);
player.add(head);

// 目(向きが分かるように前面 +Z に配置)
const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.02);
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
leftEye.position.set(-0.09, 1.35, 0.21);
player.add(leftEye);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
rightEye.position.set(0.09, 1.35, 0.21);
player.add(rightEye);

// 胴体(青いシャツ)
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.6, 0.3),
  new THREE.MeshBasicMaterial({ color: 0x2266cc })
);
body.position.set(0, 0.8, 0);
player.add(body);

// 左腕(肌色) - 回転軸を肩(腕の付け根)にずらして歩行モーションで振れるようにする
const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
leftArmGeometry.translate(0, -0.3, 0);
const leftArm = new THREE.Mesh(leftArmGeometry, new THREE.MeshBasicMaterial({ color: 0xffcc99 }));
leftArm.position.set(-0.35, 1.1, 0);
player.add(leftArm);

// 右腕(肌色)
const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
rightArmGeometry.translate(0, -0.3, 0);
const rightArm = new THREE.Mesh(rightArmGeometry, new THREE.MeshBasicMaterial({ color: 0xffcc99 }));
rightArm.position.set(0.35, 1.1, 0);
player.add(rightArm);

// 左脚(濃紺のズボン) - 回転軸を股関節(脚の付け根)にずらす
const leftLegGeometry = new THREE.BoxGeometry(0.18, 0.5, 0.18);
leftLegGeometry.translate(0, -0.25, 0);
const leftLeg = new THREE.Mesh(leftLegGeometry, new THREE.MeshBasicMaterial({ color: 0x333366 }));
leftLeg.position.set(-0.14, 0.5, 0);
player.add(leftLeg);

// 右脚(濃紺のズボン)
const rightLegGeometry = new THREE.BoxGeometry(0.18, 0.5, 0.18);
rightLegGeometry.translate(0, -0.25, 0);
const rightLeg = new THREE.Mesh(rightLegGeometry, new THREE.MeshBasicMaterial({ color: 0x333366 }));
rightLeg.position.set(0.14, 0.5, 0);
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

// --- 向き / 歩行モーション -----------------------------------------------------
// 歩行フェーズと現在のスイング角度(ラジアン)
let walkPhase = 0;
let currentSwing = 0;

// 移動方向へ最短経路でなめらかに回転させる(モデルの前面は +Z)
function updateFacing(dir) {
  const targetAngle = Math.atan2(dir.x, dir.z);
  // 角度差を -π..π の範囲に正規化(最短経路)
  const diff = Math.atan2(
    Math.sin(targetAngle - player.rotation.y),
    Math.cos(targetAngle - player.rotation.y)
  );
  if (Math.abs(diff) < 0.05) {
    // ほぼ向いている場合は正確に向く
    player.rotation.y = targetAngle;
  } else {
    player.rotation.y += diff * 0.25;
  }
}

// 脚・腕を交互にスイングさせる(歩行モーション)
// 停止中はスイングを 0 へなめらかに戻す
function updateWalkAnimation(isMoving) {
  if (isMoving) {
    walkPhase += 0.25;
  }
  const target = isMoving ? Math.sin(walkPhase) * 0.6 : 0;
  currentSwing += (target - currentSwing) * 0.2;
  // 脚(左右交互)
  leftLeg.rotation.x = currentSwing;
  rightLeg.rotation.x = -currentSwing;
  // 腕(脚と逆位相・やや小さめ)
  leftArm.rotation.x = -currentSwing * 0.7;
  rightArm.rotation.x = currentSwing * 0.7;
}

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

  const isMoving = dir.lengthSq() > 0;

  // 向き: 押している方向へ向く(障害物で止まっても向く)
  if (isMoving) {
    updateFacing(dir);
  }

  // 移動と歩行モーション
  let didMove = false;
  if (isMoving) {
    dir.normalize();
    const move = dir.clone().multiplyScalar(moveSpeed);
    if (!checkCollision(move)) {
      player.position.add(move);
      didMove = true;
    }
  }
  // 実際に動いている時のみ歩く(ぶつかって止まった時は歩行を止める)
  updateWalkAnimation(didMove);

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
