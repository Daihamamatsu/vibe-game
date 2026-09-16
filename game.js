// Updated game.js with corrected collision detection

// --- Three.js setup --------------------------------------------------------
const scene = new THREE.Scene();
// 背後の空間を水色っぽく(空色)にする
scene.background = new THREE.Color(0x87ceeb);
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

// --- Floating island -------------------------------------------------------
// プレイヤーが立つ島(プレイヤーは幅約 1 ユニットなので約 10 倍の 10x10)
const ISLAND_SIZE = 10;
const ISLAND_HALF_SIZE = ISLAND_SIZE / 2;

const island = new THREE.Group();

// 上面(土、茶色っぽくする。上表面は y=0 でプレイヤー・障害物と同じ床面)
const islandTop = new THREE.Mesh(
  new THREE.BoxGeometry(ISLAND_SIZE, 0.5, ISLAND_SIZE),
  new THREE.MeshBasicMaterial({ color: 0xa0724b, side: THREE.DoubleSide })
);
islandTop.position.y = -0.25;
island.add(islandTop);

// 下面(岩の逆ピラミッド、尖りを下に向けて浮遊島にする)
const rockGeometry = new THREE.ConeGeometry(ISLAND_HALF_SIZE * Math.SQRT2, 3, 4);
const rock = new THREE.Mesh(
  rockGeometry,
  new THREE.MeshBasicMaterial({ color: 0x8b5a2b, side: THREE.DoubleSide })
);
rock.rotateY(Math.PI / 4);  // 底辺の向きを島の辺と揃える
rock.rotateX(Math.PI);      // 尖りを下に向けてひっくり返す
rock.position.y = -0.5 - 1.5;
island.add(rock);
scene.add(island);

// 落下状態
let falling = false;
let fallSpeed = 0;
const GRAVITY = 0.008;   // 落下中に毎フレーム加わる垂直加速度
const FALL_LIMIT = -25;  // 落下でゲームオーバーになる高度

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
  // R key: restart
  if (e.key === 'r' || e.key === 'R') restartGame();
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

// --- HP system ------------------------------------------------------------
const MAX_HP = 100;
let hp = MAX_HP;
let isGameOver = false;
const hpText = document.getElementById('hp');
const hpFill = document.getElementById('hp-fill');
const gameOverScreen = document.getElementById('game-over');

// Update HP display
function updateHpDisplay() {
  hpText.textContent = Math.max(0, hp);
  hpFill.style.width = (Math.max(0, hp) / MAX_HP) * 100 + '%';
}

// Reduce player HP (game over at 0 or below)
function damagePlayer(amount) {
  if (isGameOver) return;
  hp -= amount;
  if (hp <= 0) {
    hp = 0;
    isGameOver = true;
    gameOverScreen.style.display = 'block';
  }
  updateHpDisplay();
}

// Restart: reset HP and player state
function restartGame() {
  hp = MAX_HP;
  isGameOver = false;
  gameOverScreen.style.display = 'none';
  player.position.set(0, 0, 0);
  player.rotation.y = 0;
  walkPhase = 0;
  currentSwing = 0;
  // 落下もリセット
  falling = false;
  fallSpeed = 0;
  // 敵もリセット
  enemy.position.set(enemyMinX, 0, ENEMY_Z);
  enemyDir = 1;
  enemy.rotation.y = 0;
  lastDamageTime = 0;
  updateHpDisplay();
}

updateHpDisplay();

// --- Enemy (ブロック風スライム) ---------------------------------------------
// 一定の往復ルートをパトロールし、プレイヤーと接触するとダメージを与える
const ENEMY_Z = -1.5;
const enemyMinX = -2.5;
const enemyMaxX = 2.5;
const enemySpeed = 0.03;
const ENEMY_DAMAGE = 10;
let enemyDir = 1;
let lastDamageTime = 0;
const INVULN_DURATION = 1; // ダメージ直後の無敵時間(秒)

const enemy = new THREE.Group();

// 体(緑)
const enemyBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.8),
  new THREE.MeshBasicMaterial({ color: 0x44cc44 })
);
enemyBody.position.set(0, 0.4, 0);
enemy.add(enemyBody);

// 目(パトロールの向きが変わっても見えるよう ±Z の両面に配置)
const enemyEyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.02);
const enemyEyeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
[0.405, -0.405].forEach(z => {
  const eyeL = new THREE.Mesh(enemyEyeGeometry, enemyEyeMaterial);
  eyeL.position.set(-0.15, 0.55, z);
  enemy.add(eyeL);
  const eyeR = new THREE.Mesh(enemyEyeGeometry, enemyEyeMaterial);
  eyeR.position.set(0.15, 0.55, z);
  enemy.add(eyeR);
});

enemy.position.set(enemyMinX, 0, ENEMY_Z);
scene.add(enemy);

// ノックバック: プレイヤーを敵から離れる方向に一定距離押し出す
// (押し出し先が障害物に衝突しないよう既存の衝突判定でチェック)
const KNOCKBACK_DISTANCE = 1.2;
function applyKnockback(fromPos) {
  const dx = player.position.x - fromPos.x;
  const dz = player.position.z - fromPos.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  let dirX, dirZ;
  if (len < 0.0001) {
    // 完全に同じ位置という限界ケース: 敵の進行方向へ押し出す
    dirX = enemyDir;
    dirZ = 0;
  } else {
    dirX = dx / len;
    dirZ = dz / len;
  }
  const kb = new THREE.Vector3(
    dirX * KNOCKBACK_DISTANCE,
    0,
    dirZ * KNOCKBACK_DISTANCE
  );
  // 最新の位置で衝突判定する
  player.updateMatrixWorld(true);
  if (!checkCollision(kb)) {
    player.position.add(kb);
  }
}

// 敵のパトロール(範囲の両端で反転)と接触ダメージ判定
function updateEnemy() {
  enemy.position.x += enemySpeed * enemyDir;
  if (enemy.position.x >= enemyMaxX) {
    enemy.position.x = enemyMaxX;
    enemyDir = -1;
    enemy.rotation.y = Math.PI;
  } else if (enemy.position.x <= enemyMinX) {
    enemy.position.x = enemyMinX;
    enemyDir = 1;
    enemy.rotation.y = 0;
  }

  // 接触判定(バウンディングボックスの交差、落下中は判定しない)
  const playerBox = new THREE.Box3().setFromObject(player);
  const enemyBox = new THREE.Box3().setFromObject(enemy);
  const now = performance.now() / 1000;
  if (!falling && playerBox.intersectsBox(enemyBox) &&
      now - lastDamageTime > INVULN_DURATION) {
    lastDamageTime = now;
    damagePlayer(ENEMY_DAMAGE);
    // ダメージ時のノックバック(撃墜時はゲームオーバーで固定されるためスキップ)
    if (!isGameOver) applyKnockback(enemy.position);
  }
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

  // On game over, freeze updates (render only)
  if (isGameOver) {
    renderer.render(scene, camera);
    return;
  }

  const dir = new THREE.Vector3();
  if (keys.ArrowUp) dir.z -= 1;
  if (keys.ArrowDown) dir.z += 1;
  if (keys.ArrowLeft) dir.x -= 1;
  if (keys.ArrowRight) dir.x += 1;

  if (falling) {
    // 落下中(移動入力は無視し、重力で加速して落下)
    fallSpeed += GRAVITY;
    player.position.y -= fallSpeed;
    updateWalkAnimation(false);
    // 落下限界高度まで落ちたらゲームオーバー
    if (player.position.y < FALL_LIMIT) {
      isGameOver = true;
      gameOverScreen.style.display = 'block';
    }
  } else {
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

    // 島の端判定: 島からはみ出したら落下開始
    if (Math.abs(player.position.x) > ISLAND_HALF_SIZE ||
        Math.abs(player.position.z) > ISLAND_HALF_SIZE) {
      falling = true;
    }
  }

  // 敵のパトロールと接触ダメージ
  updateEnemy();

  camera.position.x = player.position.x;
  camera.position.y = player.position.y + 5;
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
