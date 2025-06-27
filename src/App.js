import React, { useState, useEffect, useRef, useCallback } from 'react'; // 引入 useCallback
import { Plus, Dumbbell, Calendar, TrendingUp, Timer, Save, Trash2, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, BarChart3, Search, Edit, Info } from 'lucide-react';

// Firebase 相關引入
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, onSnapshot, query, deleteDoc } from 'firebase/firestore'; // 移除 'where'

// 確保在本地開發環境中 '__app_id', '__firebase_config', '__initial_auth_token' 被定義
// 這些變數由 Canvas 環境在運行時提供，本地構建時需要備用值
// 注意：這些僅用於本地編譯通過。在 Canvas 外部運行時，實際的 Firebase 配置需要手動提供。
// 我們將這些定義從元件內部移到最外層，以避免 'used before defined' 警告，同時確保它們的全局性行為
const canvasAppId = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id-for-local';
const canvasFirebaseConfig = typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {};
const canvasInitialAuthToken = typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

// ⭐ 修正：將預設數據定義為組件外部的常量，這樣它們就永遠不會改變，也就不需要作為 useEffect 的依賴 ⭐
const DEFAULT_EXERCISES_DATA = [
  { id: 'ex_default_1', name: '槓鈴臥推', category: '胸部', muscle: 'chest', description: '上半身力量訓練的經典動作，主要訓練胸大肌、三頭肌和三角肌前束。', equipmentSuggestions: '槓鈴、臥推椅', freeWeightInstructions: '躺臥在臥推椅上，雙手握住槓鈴略寬於肩，慢慢放下槓鈴至胸部，然後推回起始位置。核心收緊，背部微弓。' },
  { id: 'ex_default_2', name: '啞鈴臥推', category: '胸部', muscle: 'chest', description: '與槓鈴臥推類似，但啞鈴提供更大的運動範圍和單邊訓練的好處。', equipmentSuggestions: '啞鈴、臥推椅', freeWeightInstructions: '每手持一啞鈴，躺臥在臥推椅上，手心相對或向前，緩慢下放啞鈴至胸部外側，然後向上推起啞鈴，啞鈴之間不需接觸。' },
  { id: 'ex_default_3', name: '上斜臥推', category: '胸部', muscle: 'chest', description: '針對胸大肌上部，有助於塑造飽滿胸型。', equipmentSuggestions: '槓鈴/啞鈴、上斜臥推椅', freeWeightInstructions: '調整臥推椅為約30-45度上斜角，動作類似平板臥推，但著重於胸部上緣的發力。' },
  { id: 'ex_default_4', name: '飛鳥', category: '胸部', muscle: 'chest', description: '孤立訓練胸大肌，主要作用是胸部的內收和擠壓。', equipmentSuggestions: '啞鈴/繩索機', freeWeightInstructions: '雙臂微彎，向內擠壓啞鈴或手柄，感受胸部肌肉收縮。' },
  { id: 'ex_default_5', name: '雙槓撐體', category: '胸部', muscle: 'chest', description: '自體重量訓練，全面鍛鍊胸部、三頭肌和肩部。', equipmentSuggestions: '雙槓', freeWeightInstructions: '雙手握住雙槓，身體下放直到胸部與槓平行或略低，然後推起身體回到起始位置。身體可微前傾以更刺激胸部。' },
  { id: 'ex_default_6', name: '引體向上', category: '背部', muscle: 'back', description: '經典背部肌肉自體重量訓練，主要訓練背闊肌和二頭肌。', equipmentSuggestions: '單槓', freeWeightInstructions: '雙手寬握單槓，身體向上拉起直到下巴超過單槓，然後緩慢放下身體。保持身體穩定，避免擺動。' },
  { id: 'ex_default_7', name: '槓鈴划船', category: '背部', muscle: 'back', description: '有效增加背部厚度的複合動作，訓練背闊肌、斜方肌、菱形肌。', equipmentSuggestions: '槓鈴', freeWeightInstructions: '雙腳與肩同寬站立，屈髖俯身，背部挺直，雙手握住槓鈴，將槓鈴拉向腹部，感受背部肌肉收縮，然後緩慢放下。' },
  { id: 'ex_default_8', name: '啞鈴划船', category: '背部', muscle: 'back', description: '單邊訓練，有助於改善左右肌力不平衡，更孤立地刺激背部肌肉。', equipmentSuggestions: '啞鈴、長凳', freeWeightInstructions: '單膝跪於長凳上，一手扶住長凳支撐，另一手持啞鈴，將啞鈴拉向腰部，感受背部收縮。' },
  { id: 'ex_default_9', name: '滑輪下拉', category: '背部', muscle: 'back', description: '利用器械模擬引體向上動作，適合不同肌力水平的使用者。', equipmentSuggestions: '滑輪下拉機', freeWeightInstructions: '坐在器械上，雙手寬握把手，將把手拉向胸部上方，感受背闊肌的伸展和收縮。' },
  { id: 'ex_default_10', name: '硬舉', category: '背部', muscle: 'back', description: '全身性複合動作，強健背部、腿部和核心肌群。', equipmentSuggestions: '槓鈴', freeWeightInstructions: '雙腳與髖同寬站立，俯身握住槓鈴，保持背部挺直，利用臀部和腿部力量將槓鈴從地面提起，直到身體直立，然後緩慢放下。' },
  { id: 'ex_default_11', name: '肩推', category: '肩膀', muscle: 'shoulders', description: '針對三角肌前束和中束的複合動作，有效增加肩部力量。', equipmentSuggestions: '槓鈴/啞鈴、推舉椅', freeWeightInstructions: '坐姿或站姿，雙手握住槓鈴或啞鈴，從肩部位置向上推舉至手臂伸直，然後緩慢下放。' },
  { id: 'ex_default_12', name: '側平舉', category: '肩膀', muscle: 'shoulders', description: '孤立訓練三角肌中束，是增加肩部寬度的關鍵動作。', equipmentSuggestions: '啞鈴', freeWeightInstructions: '每手持一啞鈴，雙臂微彎，將啞鈴向身體兩側抬起，直到手臂與肩平行，感受肩部中束的收縮。' },
  { id: 'ex_default_13', name: '前平舉', category: '肩膀', 'muscle': 'shoulders', description: '孤立訓練三角肌前束。', equipmentSuggestions: '啞鈴', freeWeightInstructions: '每手持一啞鈴，雙臂伸直，將啞鈴向前上方抬起，直到手臂與肩平行。' },
  { id: 'ex_default_14', name: '後束飛鳥', category: '肩膀', muscle: 'shoulders', description: '訓練三角肌後束，有助於改善圓肩和平衡肩部發展。', equipmentSuggestions: '啞鈴/繩索機', freeWeightInstructions: '俯身或坐在器械上，雙臂微彎，向身體兩側後方打開手臂，感受肩部後束的收縮。' },
  { id: 'ex_default_15', name: '聳肩', category: '肩膀', muscle: 'shoulders', description: '主要訓練斜方肌上部。', equipmentSuggestions: '啞鈴/槓鈴', freeWeightInstructions: '雙手持啞鈴或槓鈴，雙肩向上聳起，盡量靠近耳朵，然後緩慢放下。' },
  { id: 'ex_default_16', name: '二頭彎舉', category: '手臂', muscle: 'arms', description: '孤立訓練肱二頭肌，增加手臂圍度。', equipmentSuggestions: '啞鈴/槓鈴/繩索機', freeWeightInstructions: '站立或坐姿，雙手持啞鈴或槓鈴，將前臂向上彎舉，直到二頭肌完全收縮，然後緩慢放下。' },
  { id: 'ex_default_17', name: '三頭下壓', category: '手臂', muscle: 'arms', description: '孤立訓練肱三頭肌，增加手臂圍度。', equipmentSuggestions: '繩索機', freeWeightInstructions: '面對繩索機站立，雙手握住把手，將手臂向下壓，直到手臂完全伸直，感受三頭肌收縮。' },
  { id: 'ex_default_18', name: '錘式彎舉', category: '手臂', muscle: 'arms', description: '訓練肱肌和肱橈肌，增加手臂厚度。', equipmentSuggestions: '啞鈴', freeWeightInstructions: '雙手持啞鈴，手心相對，將前臂向上彎舉，動作類似二頭彎舉。' },
  { id: 'ex_default_19', name: '三頭伸展', category: '手臂', muscle: 'arms', description: '孤立訓練三頭肌，常作為輔助動作。', equipmentSuggestions: '啞鈴', freeWeightInstructions: '單手或雙手持啞鈴，將手臂向上伸直，然後向後彎曲，直到啞鈴位於頭部後方，再伸直手臂。' },
  { id: 'ex_default_20', name: '窄握推舉', category: '手臂', muscle: 'arms', description: '針對三頭肌的複合推舉動作。', equipmentSuggestions: '槓鈴', freeWeightInstructions: '躺臥在臥推椅上，雙手窄握槓鈴（與肩同寬或略窄），慢慢放下槓鈴至胸部，然後推回起始位置，著重三頭肌發力。' },
  { id: 'ex_default_21', name: '深蹲', category: '腿部', muscle: 'legs', description: '「訓練之王」，全身性複合動作，強健下肢、核心和臀部。', equipmentSuggestions: '槓鈴/壺鈴/啞鈴', freeWeightInstructions: '雙腳與肩同寬站立，膝蓋和腳尖方向一致，核心收緊，像坐在椅子上一樣下蹲，直到大腿與地面平行或更低，然後推起回到起始位置。' },
  { id: 'ex_default_22', name: '腿推', category: '腿部', muscle: 'legs', description: '器械訓練，有效刺激股四頭肌和臀大肌，適合無法進行深蹲的人。', equipmentSuggestions: '腿推機', freeWeightInstructions: '坐在腿推機上，雙腳放在踏板上，將踏板向上推起，直到腿部幾乎伸直，然後緩慢放下。' },
  { id: 'ex_default_23', name: '腿屈伸', category: '腿部', muscle: 'legs', description: '孤立訓練股四頭肌。', equipmentSuggestions: '腿屈伸機', freeWeightInstructions: '坐在器械上，將腳踝勾在滾墊下方，向上伸直雙腿，感受股四頭肌收縮，然後緩慢放下。' },
  { id: 'ex_default_24', name: '腿後彎舉', category: '腿部', muscle: 'legs', description: '孤立訓練股二頭肌。', equipmentSuggestions: '腿後彎舉機', freeWeightInstructions: '俯臥或坐姿於器械上，將腳踝勾在滾墊下方，彎曲膝蓋將滾墊拉向臀部，感受股二頭肌收縮。' },
  { id: 'ex_default_25', name: '提踵', category: '腿部', muscle: 'legs', description: '訓練小腿肌群，包括腓腸肌和比目魚肌。', equipmentSuggestions: '啞鈴/器械', freeWeightInstructions: '站立，腳尖著地，腳跟抬起，盡可能向上抬高，感受小腿肌肉收縮，然後緩慢放下。' },
  { id: 'ex_default_26', name: '仰臥起坐', category: '核心', muscle: 'core', description: '經典腹部訓練動作，鍛鍊腹直肌。', equipmentSuggestions: '無', freeWeightInstructions: '仰臥於地面，雙手抱頭或交叉於胸前，利用腹部力量將上半身抬起，直到肩胛骨離開地面，然後緩慢放下。' },
  { id: 'ex_default_27', name: '棒式', category: '核心', muscle: 'core', description: '全身性核心穩定訓練，有效鍛鍊深層核心肌群。', equipmentSuggestions: '瑜伽墊', freeWeightInstructions: '俯臥，用前臂和腳尖支撐身體，保持身體從頭到腳踝呈一直線，核心收緊，避免臀部下塌或抬高。' },
  { id: 'ex_default_28', name: '俄羅斯轉體', category: '核心', muscle: 'core', description: '訓練腹斜肌，有助於塑造腰部線條。', equipmentSuggestions: '啞鈴/藥球（可選）', freeWeightInstructions: '坐姿，雙腳抬離地面，身體向後傾斜約45度，雙手握住啞鈴或藥球，左右轉動上半身，感受腹斜肌的收縮。' },
  { id: 'ex_default_29', name: '腹部輪', category: '核心', muscle: 'core', description: '高強度核心訓練，強健腹部和穩定肌群。', equipmentSuggestions: '腹部輪', freeWeightInstructions: '雙膝跪地，雙手握住腹部輪手柄，向前滾動腹部輪，直到身體幾乎平躺，然後利用核心力量將腹部輪拉回起始位置。' },
  { id: 'ex_default_30', name: '懸垂舉腿', category: '核心', muscle: 'core', description: '高難度核心訓練，有效刺激下腹部肌肉。', equipmentSuggestions: '單槓', freeWeightInstructions: '雙手懸掛於單槓上，雙腿併攏，向上抬起雙腿，直到大腿與地面平行或更高，然後緩慢放下。' }
];

const DEFAULT_WORKOUT_PLANS_DATA = [
  {
    // 注意: 預設計劃的 ID 不再是數字，而是字串，與 Firestore 的 document ID 保持一致
    id: 'plan_default_1', 
    name: '全身訓練 A (範例)',
    exercises: [
      { id: 'ex_default_21', name: '深蹲', category: '腿部', muscle: 'legs', weight: 80, sets: 4, reps: 8 },
      { id: 'ex_default_1', name: '槓鈴臥推', category: '胸部', muscle: 'chest', weight: 60, sets: 3, reps: 10 },
      { id: 'ex_default_7', name: '槓鈴划船', category: '背部', muscle: 'back', weight: 50, sets: 3, reps: 12 },
      { id: 'ex_default_11', name: '肩推', category: '肩膀', muscle: 'shoulders', weight: 30, sets: 3, reps: 10 },
      { id: 'ex_default_16', name: '二頭彎舉', category: '手臂', muscle: 'arms', weight: 15, sets: 3, reps: 12 },
    ],
    createdDate: '2025/06/25'
  },
];


const App = () => { // 將主元件名稱從 WorkoutApp 改為 App

  // Firebase 實例和使用者 ID 狀態
  const [db, setDb] = useState(null);
  // ⭐ 修正：移除 authInstance 狀態變數，直接使用局部變數 auth ⭐
  // const [authInstance, setAuthInstance] = useState(null); 
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // 標記 Firebase Auth 是否準備就緒

  // Canvas 環境提供的應用程式 ID (用於 Firestore 路徑)
  // 注意：在 Canvas 外部部署時，如果您的 Firestore 安全規則依賴於特定的 appId，
  // 您需要將 'default-app-id' 替換為您 Firebase 規則中設定的實際 appId (例如 Canvas 專案的 ID)
  // 這裡使用外部定義的 canvasAppId
  const appId = canvasAppId === 'default-app-id-for-local' ? 'workout-tracker-netlify-app' : canvasAppId;

  // UI 頁面導航狀態
  const [currentPage, setCurrentPage] = useState('daily');

  // 資料狀態
  const [workoutData, setWorkoutData] = useState([]); // 實際完成的訓練記錄
  const [exercises, setExercises] = useState([]); // 動作列表 (預設 + 自訂)
  const [workoutPlans, setWorkoutPlans] = useState([]); // 訓練計劃
  const [bodyStats, setBodyStats] = useState([]); // 身體數據

  // 計時器狀態
  const [timerSeconds, setTimerSeconds] = useState(90); // 總設定時間
  const [isTimerRunning, setIsTimerRunning] = useState(false); // 計時器是否運行
  const [timerDisplay, setTimerDisplay] = useState(90); // 實際顯示的時間
  const timerIntervalRef = useRef(null); // 用於儲存計時器 Interval ID

  // 今日訓練狀態
  const [todayWorkout, setTodayWorkout] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(''); // 儲存手動新增訓練時選擇的動作ID
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState(''); // 儲存從計劃載入時選擇的計劃ID
  const [selectedCategory, setSelectedCategory] = useState(''); // 篩選動作的部位
  const [showHistory, setShowHistory] = useState(false); // 控制是否顯示今日訓練歷史記錄

  // 自訂動作狀態
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState('');
  // 新增動作詳細資訊輸入框
  const [newExerciseDescription, setNewExerciseDescription] = useState('');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('');
  const [newExerciseFreeWeight, setNewExerciseFreeWeight] = useState('');

  // 訓練計劃創建與編輯狀態
  const [planName, setPlanName] = useState(''); // 新計劃名稱
  const [selectedPlanExercises, setSelectedPlanExercises] = useState([]); // 新計劃中選擇的動作ID列表
  const [editingPlan, setEditingPlan] = useState(null); // 儲存正在編輯的計劃對象，null 表示沒有編輯中的計劃
  const [planSearchQuery, setPlanSearchQuery] = useState(''); // 搜尋訓練計劃的關鍵字

  // 身體數據狀態
  const [bodyWeight, setBodyWeight] = useState('');
  const [muscleWeight, setMuscleWeight] = useState('');
  const [fatWeight, setFatWeight] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');

  // 統計視圖狀態
  const [statsView, setStatsView] = useState('week'); // week, month, year

  // 自定義提示框狀態
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  // 將 alertId 從狀態中移除，它沒有被有效使用，或者可以整合到 alertMessage 中
  // const [alertId, setAlertId] = useState('');

  // 訓練動作詳情和編輯狀態
  const [viewingExerciseDetails, setViewingExerciseDetails] = useState(null); // 儲存正在查看詳情的動作
  const [editingExercise, setEditingExercise] = useState(null); // 儲存正在編輯的動作

  // 顯示自定義提示框 (使用 useCallback 優化)
  const showCustomAlert = useCallback((message, id = '') => {
    setAlertMessage(message);
    // 如果需要區分不同的提示，可以將 id 包含在 message 中或在其他地方使用
    // setAlertId(id); // 如果不需要，可以註釋掉此行以消除警告
    setShowAlert(true);
    // 自動關閉提示框
    setTimeout(() => {
      setShowAlert(false);
      setAlertMessage('');
      // setAlertId(''); // 同步移除
    }, 3000);
  }, []); // 空依賴陣列表示這個函數只創建一次

  // Firebase 初始化和身份驗證
  useEffect(() => {
    let firebaseConfigToUse = null;

    // 優先從 Canvas 環境載入配置
    if (Object.keys(canvasFirebaseConfig).length > 0) {
        firebaseConfigToUse = canvasFirebaseConfig;
        console.log("Using Firebase config from Canvas environment.");
    } else {
        // 如果沒有從 Canvas 載入，則使用用戶手動填寫的配置
        firebaseConfigToUse = {
            apiKey: "AIzaSyAFYByFw1XPghJYPofGg-punSt6gfSgR00",
            authDomain: "workouttrackerapp-3d241.firebaseapp.com",
            projectId: "workouttrackerapp-3d241",
            storageBucket: "workouttrackerapp-3d241.firebasestorage.app",
            messagingSenderId: "846450892613",
            appId: "1:846450892613:web:0e02e86ab853f8e443282c",
            // measurementId: "YOUR_MEASUREMENT_ID" // 可選，如果您的專案有啟用 Google Analytics
        };
        
        // 再次檢查是否還是預設的 placeholder 值（即使已替換為您的值，這裡仍檢查以避免未替換的情況）
        if (!firebaseConfigToUse.apiKey || 
            firebaseConfigToUse.apiKey === "YOUR_API_KEY" || // 以防萬一，再次檢查
            firebaseConfigToUse.authDomain === "YOUR_AUTH_DOMAIN" || 
            firebaseConfigToUse.projectId === "YOUR_PROJECT_ID" || 
            firebaseConfigToUse.appId === "YOUR_APP_ID") {
            
            console.error("Firebase config is still using placeholder values or is incomplete. Using local storage as fallback.");
            showCustomAlert('Firebase 配置無效，請填寫您的專案配置。將使用本地儲存。');
            setIsAuthReady(true);
            setExercises(DEFAULT_EXERCISES_DATA); // ⭐ 修正：使用全局常量 ⭐
            setWorkoutPlans(DEFAULT_WORKOUT_PLANS_DATA); // ⭐ 修正：使用全局常量 ⭐
            return;
        }
        console.log("Using explicit Firebase config for non-Canvas environment.");
    }

    // 初始化 Firebase
    const app = initializeApp(firebaseConfigToUse);
    setDb(getFirestore(app)); // ⭐ 修正：直接將 getFirestore(app) 的結果設置到 db 狀態中 ⭐

    const auth = getAuth(app); // 使用局部變數 auth
    // ⭐ 修正：移除 setAuthInstance(auth); 這一行 ⭐

    const authenticate = async () => {
      try {
        // 使用 Canvas 環境提供的初始認證令牌，如果沒有則匿名登入
        // 注意：在 Canvas 外部部署時，canvasInitialAuthToken 為 null，會自動匿名登入
        if (canvasInitialAuthToken) {
          await signInWithCustomToken(auth, canvasInitialAuthToken); // ⭐ 使用局部變數 auth ⭐
          console.log("Signed in with custom token.");
        } else {
          await signInAnonymously(auth); // ⭐ 使用局部變數 auth ⭐
          console.log("Signed in anonymously.");
        }
      } catch (error) {
        console.error("Error during Firebase authentication:", error);
        showCustomAlert('Firebase 認證失敗，將使用本地儲存。');
        setExercises(DEFAULT_EXERCISES_DATA); // ⭐ 修正：使用全局常量 ⭐
        setWorkoutPlans(DEFAULT_WORKOUT_PLANS_DATA); // ⭐ 修正：使用全局常量 ⭐
      } finally {
        setIsAuthReady(true); // 標記為認證流程完成
      }
    };

    authenticate();

    // 監聽身份驗證狀態變化
    // ⭐ 修正：onAuthStateChanged 的回調函數的依賴應該是 auth 這個局部變數 ⭐
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => { 
      if (user) {
        setUserId(user.uid);
        console.log("User UID:", user.uid);
      } else {
        setUserId(null);
        console.log("User signed out.");
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [appId, showCustomAlert]); // ⭐ 修正：移除了 canvasInitialAuthToken 依賴 ⭐

  // 資料載入 (從 Firestore 或使用預設值)
  useEffect(() => {
    // 只有當 Firebase 和用戶 ID 都準備好時才執行數據載入
    if (!isAuthReady || !db || !userId) {
      // 如果沒有 Firebase 配置，則已在上面的 useEffect 中設定了本地數據
      return;
    }

    const loadDataFromFirestore = async () => {
      console.log(`Loading data for user: ${userId}, app: ${appId}`);

      // 載入 Exercises
      const exercisesRef = collection(db, `artifacts/${appId}/users/${userId}/exercises`);
      const exercisesSnap = await getDocs(exercisesRef);
      if (exercisesSnap.empty) {
        // 如果 Firestore 中沒有 exercises，載入預設值並保存到 Firestore
        setExercises(DEFAULT_EXERCISES_DATA); // ⭐ 修正：使用全局常量 ⭐
        console.log("Loaded default exercises.");
        for (const ex of DEFAULT_EXERCISES_DATA) { // ⭐ 修正：使用全局常量 ⭐
          // 使用 setDoc 並指定自訂 ID，以避免每次重新整理都生成新文檔
          await setDoc(doc(exercisesRef, ex.id), ex); 
        }
        console.log("Saved default exercises to Firestore.");
      } else {
        setExercises(exercisesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }))); // Firestore ID 是字串
        console.log("Loaded exercises from Firestore.");
      }

      // 載入 Workout Plans
      const plansRef = collection(db, `artifacts/${appId}/users/${userId}/workoutPlans`);
      const plansSnap = await getDocs(plansRef);
      if (plansSnap.empty) {
        setWorkoutPlans(DEFAULT_WORKOUT_PLANS_DATA); // ⭐ 修正：使用全局常量 ⭐
        console.log("Loaded default workout plans.");
        for (const plan of DEFAULT_WORKOUT_PLANS_DATA) { // ⭐ 修正：使用全局常量 ⭐
          // 使用 setDoc 並指定自訂 ID
          await setDoc(doc(plansRef, plan.id), plan);
        }
        console.log("Saved default workout plans to Firestore.");
      } else {
        setWorkoutPlans(plansSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        console.log("Loaded workout plans from Firestore.");
      }

      // 載入 Workout Data (歷史訓練記錄)
      const workoutDataRef = collection(db, `artifacts/${appId}/users/${userId}/workoutData`);
      const workoutDataSnap = await getDocs(workoutDataRef);
      setWorkoutData(workoutDataSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      console.log("Loaded workout data from Firestore.");

      // 載入 Body Stats
      const bodyStatsRef = collection(db, `artifacts/${appId}/users/${userId}/bodyStats`);
      const bodyStatsSnap = await getDocs(bodyStatsRef);
      setBodyStats(bodyStatsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      console.log("Loaded body stats from Firestore.");
    };

    loadDataFromFirestore();

    // 設定即時監聽 (onSnapshot)，以確保數據實時更新
    // 監聽 exercises
    const exercisesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/exercises`));
    const unsubscribeExercises = onSnapshot(exercisesQuery, (snapshot) => {
      setExercises(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => console.error("Error listening to exercises:", error));

    // 監聽 workoutPlans
    const plansQuery = query(collection(db, `artifacts/${appId}/users/${userId}/workoutPlans`));
    const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
      setWorkoutPlans(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => console.error("Error listening to workout plans:", error));

    // 監聽 workoutData
    const workoutDataQuery = query(collection(db, `artifacts/${appId}/users/${userId}/workoutData`));
    const unsubscribeWorkoutData = onSnapshot(workoutDataQuery, (snapshot) => {
      setWorkoutData(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => console.error("Error listening to workout data:", error));

    // 監聽 bodyStats
    const bodyStatsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/bodyStats`));
    const unsubscribeBodyStats = onSnapshot(bodyStatsQuery, (snapshot) => {
      setBodyStats(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => console.error("Error listening to body stats:", error));

    return () => {
      unsubscribeExercises();
      unsubscribePlans();
      unsubscribeWorkoutData();
      unsubscribeBodyStats();
    };
  }, [isAuthReady, db, userId, appId]); // 依賴項是正確的

  // 計時器效果
  useEffect(() => {
    if (isTimerRunning && timerDisplay > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerDisplay(time => time - 1);
      }, 1000);
    } else if (timerDisplay === 0) {
      setIsTimerRunning(false);
      clearInterval(timerIntervalRef.current);
      showCustomAlert('休息時間結束！', 'timer-end');
    }
    // 當 isTimerRunning 或 timerDisplay 改變時，清除舊的 Interval
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timerDisplay, showCustomAlert]); // 新增 showCustomAlert 到依賴陣列

  // 格式化時間顯示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 添加今日訓練記錄 (本地操作)
  const addTodayWorkout = () => {
    // 這裡的 selectedExercise 是 Firebase 文檔 ID (字串)
    const exercise = exercises.find(ex => ex.id === selectedExercise); 
    if (!exercise) {
      showCustomAlert('未找到選定的訓練動作或欄位未填寫！', 'exercise-not-found');
      return;
    }
    if (!weight || !sets || !reps) {
        showCustomAlert('請填寫所有訓練記錄欄位！', 'add-workout-error');
        return;
    }

    const newRecord = {
      date: new Date().toLocaleDateString('zh-TW'),
      exerciseId: selectedExercise, // 儲存 Firebase 文檔 ID (字串)
      exerciseName: exercise.name,
      category: exercise.category,
      muscle: exercise.muscle,
      weight: parseFloat(weight),
      sets: parseInt(sets),
      reps: parseInt(reps),
      completed: false
    };
    
    // 將新記錄添加到今日訓練的暫存列表 (不是直接保存到 Firestore)
    setTodayWorkout(prev => [...prev, newRecord]);
    
    setSelectedExercise('');
    setWeight('');
    setSets('');
    setReps('');
    showCustomAlert('訓練記錄已新增到今日菜單！', 'add-workout-success');
  };

  // 從訓練計劃載入動作 (本地操作)
  const loadWorkoutPlan = () => {
    if (!selectedWorkoutPlan) {
      showCustomAlert('請選擇一個訓練計劃！', 'select-plan-error');
      return;
    }
    
    const plan = workoutPlans.find(p => p.id === selectedWorkoutPlan); 
    if (!plan) {
      showCustomAlert('未找到選定的訓練計劃！', 'plan-not-found');
      return;
    }
    
    const planWorkouts = plan.exercises.map(exercise => ({
      id: Date.now() + Math.random(), // 臨時前端 ID，用於列表鍵值
      date: new Date().toLocaleDateString('zh-TW'),
      exerciseId: exercise.id, // 動作的 Firebase 文檔 ID (字串)
      exerciseName: exercise.name,
      category: exercise.category,
      muscle: exercise.muscle,
      weight: exercise.weight || 0,
      sets: exercise.sets || 0,
      reps: exercise.reps || 0,
      completed: false
    }));
    
    setTodayWorkout(planWorkouts);
    setSelectedWorkoutPlan('');
    showCustomAlert(`訓練計劃 "${plan.name}" 已載入！`, 'load-plan-success');
  };

  // 切換今日訓練記錄的完成狀態 (本地操作)
  const toggleCompleted = (id) => {
    setTodayWorkout(todayWorkout.map(workout => 
      workout.id === id ? { ...workout, completed: !workout.completed } : workout
    ));
  };

  // 更新今日訓練記錄中的重量、組數、次數 (本地操作)
  const updateWorkoutRecord = (id, field, value) => {
    setTodayWorkout(todayWorkout.map(workout => 
      workout.id === id ? { ...workout, [field]: parseFloat(value) || 0 } : workout
    ));
  };

  // 將今日訓練儲存為新的訓練計劃到 Firestore
  const saveAsNewPlan = async () => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (todayWorkout.length === 0) {
      showCustomAlert('今日訓練列表為空，無法儲存為計劃。', 'empty-today-workout');
      return;
    }
    
    const planNameInput = prompt('請輸入新訓練計劃名稱：');
    if (!planNameInput) {
      showCustomAlert('未輸入計劃名稱，儲存已取消。', 'plan-name-empty');
      return;
    }
    
    const exercisesInPlan = todayWorkout.map(w => ({
      id: w.exerciseId, // 使用動作的 Firebase 文檔 ID (字串)
      name: w.exerciseName,
      category: w.category,
      muscle: w.muscle,
      weight: w.weight,
      sets: w.sets,
      reps: w.reps,
    }));

    const newPlan = {
      name: planNameInput,
      exercises: exercisesInPlan,
      createdDate: new Date().toLocaleDateString('zh-TW')
    };
    
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/workoutPlans`), newPlan);
      showCustomAlert('訓練計劃已儲存！', 'plan-saved');
    } catch (e) {
      console.error("Error adding plan: ", e);
      showCustomAlert('儲存訓練計劃失敗！', 'plan-save-fail');
    }
  };

  // 儲存今日訓練記錄到 workoutData 集合 (Firestore)
  const saveTodayWorkout = async () => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (todayWorkout.length === 0) {
      showCustomAlert('今日訓練列表為空，無需儲存。', 'empty-today-workout-save');
      return;
    }
    
    const completedWorkouts = todayWorkout.filter(w => w.completed && w.weight > 0 && w.sets > 0 && w.reps > 0);
    if (completedWorkouts.length === 0) {
      showCustomAlert('沒有完成且有數據的訓練記錄可供儲存。', 'no-completed-workouts');
      return;
    }

    try {
      for (const workout of completedWorkouts) {
        const { id, ...dataToSave } = workout; // 移除臨時前端 ID
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/workoutData`), dataToSave);
      }
      showCustomAlert('今日訓練已儲存！', 'today-workout-saved');
      setTodayWorkout([]); // 清空今日訓練列表
    } catch (e) {
      console.error("Error saving today's workout: ", e);
      showCustomAlert('儲存今日訓練失敗！', 'save-workout-fail');
    }
  };

  // 獲取歷史訓練記錄（按日期分組）
  const getHistoryByDate = () => {
    const grouped = {};
    workoutData.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    return grouped;
  };

  // 獲取過濾後的動作列表 (用於手動新增訓練和創建計劃時選擇動作)
  const getFilteredExercises = () => {
    if (selectedCategory) {
      return exercises.filter(ex => ex.category === selectedCategory);
    }
    return exercises;
  };

  // 添加自訂動作到 Firestore
  const addCustomExercise = async () => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (!newExerciseName || !newExerciseCategory) {
      showCustomAlert('請填寫動作名稱和部位！', 'add-custom-exercise-error');
      return;
    }
    
    const newExercise = {
      name: newExerciseName,
      category: newExerciseCategory,
      muscle: newExerciseCategory.toLowerCase(),
      description: newExerciseDescription,
      equipmentSuggestions: newExerciseEquipment,
      freeWeightInstructions: newExerciseFreeWeight
    };
    
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/exercises`), newExercise);
      showCustomAlert('自訂動作已新增！', 'custom-exercise-added');
    } catch (e) {
      console.error("Error adding document: ", e);
      showCustomAlert('新增自訂動作失敗！', 'add-exercise-fail');
    }
    
    setNewExerciseName('');
    setNewExerciseCategory('');
    setNewExerciseDescription('');
    setNewExerciseEquipment('');
    setNewExerciseFreeWeight('');
  };

  // 刪除動作 (從 Firestore)
  const deleteExercise = async (exerciseId) => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    // 使用自訂訊息框而非 window.confirm
    const confirmDelete = window.confirm("確定要刪除此動作嗎？此操作不可逆！"); 
    if (!confirmDelete) {
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/exercises`, exerciseId));
      showCustomAlert('動作已刪除！', 'exercise-deleted');
      setViewingExerciseDetails(null); // 如果正在查看該動作，關閉詳情
      setEditingExercise(null); // 如果正在編輯該動作，關閉編輯
    } catch (e) {
      console.error("Error deleting exercise: ", e);
      showCustomAlert('刪除動作失敗！', 'delete-exercise-fail');
    }
  };

  // 更新動作 (到 Firestore)
  const updateExercise = async (updatedExercise) => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (!updatedExercise || !updatedExercise.id) {
      showCustomAlert('更新動作時缺少必要資訊！', 'update-exercise-error');
      return;
    }
    try {
      await setDoc(doc(db, `artifacts/${appId}/users/${userId}/exercises`, updatedExercise.id), updatedExercise);
      showCustomAlert('動作已更新！', 'exercise-updated');
      setEditingExercise(null); // 關閉編輯模式
      setViewingExerciseDetails(updatedExercise); // 更新詳細資訊頁面
    } catch (e) {
      console.error("Error updating exercise: ", e);
      showCustomAlert('更新動作失敗！', 'update-exercise-fail');
    }
  };

  // 創建新的訓練計劃到 Firestore
  const createWorkoutPlan = async () => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (!planName || selectedPlanExercises.length === 0) {
      showCustomAlert('請輸入計劃名稱並選擇至少一個動作！', 'create-plan-error');
      return;
    }
    
    const exercisesForPlan = selectedPlanExercises.map(id => {
      const exercise = exercises.find(ex => ex.id === id);
      return {
        id: exercise.id, // 使用動作的 Firebase 文檔 ID (字串)
        name: exercise.name,
        category: exercise.category,
        muscle: exercise.muscle,
        weight: 0,
        sets: 0,
        reps: 0
      };
    });

    const newPlan = {
      name: planName,
      exercises: exercisesForPlan,
      createdDate: new Date().toLocaleDateString('zh-TW')
    };
    
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/workoutPlans`), newPlan);
      showCustomAlert('訓練計劃已成功創建！', 'plan-created');
    } catch (e) {
      console.error("Error creating plan: ", e);
      showCustomAlert('創建計劃失敗！', 'create-plan-fail');
    }

    setPlanName('');
    setSelectedPlanExercises([]);
    setSelectedCategory('');
  };

  // 更新編輯中的訓練計劃 (Firebase 操作)
  const updateEditingPlan = async (updatedPlan) => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (!updatedPlan || !updatedPlan.id) {
      showCustomAlert('更新計劃時缺少必要的資訊！', 'update-plan-error');
      return;
    }

    try {
      // 確保內部 exercise 的 id 仍然是字串（Firebase 文檔 ID）
      const exercisesToSave = updatedPlan.exercises.map(ex => ({
        ...ex,
        id: String(ex.id) // 確保 ID 是字串
      }));
      
      const planRef = doc(db, `artifacts/${appId}/users/${userId}/workoutPlans`, updatedPlan.id);
      await setDoc(planRef, { ...updatedPlan, exercises: exercisesToSave });
      showCustomAlert('計劃已更新！', 'plan-updated');
    } catch (e) {
      console.error("Error updating plan: ", e);
      showCustomAlert('更新計劃失敗！', 'update-plan-fail');
    }
  };

  // 添加身體數據到 Firestore
  const addBodyStats = async () => {
    if (!db || !userId) { showCustomAlert('資料庫未準備好或用戶未登入。', 'db-not-ready'); return; }
    if (!bodyWeight) {
      showCustomAlert('請輸入體重！', 'body-weight-empty');
      return;
    }
    
    const newStats = {
      date: new Date().toLocaleDateString('zh-TW'),
      weight: parseFloat(bodyWeight),
      muscleWeight: muscleWeight ? parseFloat(muscleWeight) : null,
      fatWeight: fatWeight ? parseFloat(fatWeight) : null,
      bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : null
    };
    
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/bodyStats`), newStats);
      showCustomAlert('身體數據已記錄！', 'body-stats-added');
    } catch (e) {
      console.error("Error adding body stats: ", e);
      showCustomAlert('記錄身體數據失敗！', 'add-body-stats-fail');
    }

    setBodyWeight('');
    setMuscleWeight('');
    setFatWeight('');
    setBodyFatPercent('');
  };

  // 計算統計數據
  const getStats = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(statsView) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }
    
    const filteredData = workoutData.filter(record => {
      const parts = record.date.split('/');
      // 確保日期格式正確，這裡假設為YYYY/MM/DD
      let recordDate;
      if (parts.length === 3) {
          recordDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
          recordDate = new Date(record.date);
      }
      return recordDate >= startDate;
    });
    
    const muscleGroups = {};
    const categoryStats = {};
    
    filteredData.forEach(record => {
      if (!muscleGroups[record.muscle]) {
        muscleGroups[record.muscle] = 0;
      }
      muscleGroups[record.muscle] += record.sets;
      
      if (!categoryStats[record.category]) {
        categoryStats[record.category] = 0;
      }
      categoryStats[record.category] += record.sets;
    });
    
    const workoutDays = new Set(filteredData.map(record => record.date)).size;
    
    return { 
      muscleGroups, 
      categoryStats, 
      workoutDays, 
      totalSets: filteredData.length,
      completedExercises: filteredData.length
    };
  };

  const stats = getStats();

  // 渲染底部導航欄
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 shadow-lg z-10">
      <div className="flex justify-around">
        {[
          { key: 'daily', icon: Calendar, label: '今日訓練' },
          { key: 'exercises', icon: Dumbbell, label: '訓練動作' },
          { key: 'plans', icon: BarChart3, label: '訓練計劃' },
          { key: 'progress', icon: TrendingUp, label: '進度追蹤' },
          { key: 'timer', icon: Timer, label: '計時器' }
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              setCurrentPage(key);
              setEditingPlan(null);
              setPlanSearchQuery('');
              setSelectedCategory('');
              setViewingExerciseDetails(null); // 切換頁面時關閉動作詳情
              setEditingExercise(null); // 切換頁面時關閉動作編輯
            }}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors duration-200 ${
              currentPage === key 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // 渲染今日訓練頁面
  const renderDailyWorkout = () => (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">今日訓練記錄</h1>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          title="查看歷史記錄"
        >
          <Calendar size={24} />
        </button>
      </div>

      {showHistory ? (
        // 歷史記錄頁面
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-full"
              title="返回今日訓練"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">訓練歷史</h2>
          </div>
          
          {Object.entries(getHistoryByDate())
            .sort(([a], [b]) => {
              const dateA = new Date(a.split('/').map(part => parseInt(part)).join('/'));
              const dateB = new Date(b.split('/').map(part => parseInt(part)).join('/'));
              return dateB - dateA;
            })
            .map(([date, records]) => (
            <div key={date} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">{date}</h3>
              <div className="space-y-2">
                {records.map(record => (
                  <div key={record.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-100">
                    <div>
                      <div className="font-semibold text-gray-800">{record.exerciseName}</div>
                      <div className="text-sm text-gray-600">
                        {record.weight}kg × {record.sets}組 × {record.reps}次
                      </div>
                    </div>
                    <div className="text-green-600">✓</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(getHistoryByDate()).length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              <p>目前沒有歷史訓練記錄。</p>
            </div>
          )}
        </div>
      ) : (
        // 主要訓練頁面
        <>
          {/* 選擇訓練計劃 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">載入訓練計劃</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedWorkoutPlan}
                onChange={(e) => setSelectedWorkoutPlan(e.target.value)}
              >
                <option value="">選擇已建立的訓練計劃</option>
                {workoutPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadWorkoutPlan}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
                disabled={!selectedWorkoutPlan}
              >
                載入計劃
              </button>
            </div>
          </div>

          {/* 手動新增訓練 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">手動新增訓練</h2>
            
            <div className="space-y-4">
              {/* 部位選擇 */}
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedExercise('');
                }}
              >
                <option value="">選擇訓練部位</option>
                {[...new Set(exercises.map(ex => ex.category))].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* 動作選擇 */}
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                disabled={getFilteredExercises().length === 0}
              >
                <option value="">選擇訓練動作</option>
                {getFilteredExercises().map(exercise => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  placeholder="重量(kg)"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="0"
                />
                <input
                  type="number"
                  placeholder="組數"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  min="0"
                />
                <input
                  type="number"
                  placeholder="次數"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  min="0"
                />
              </div>
              
              <button
                onClick={addTodayWorkout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                新增記錄
              </button>
            </div>
          </div>
          
          {/* 今日訓練列表 */}
          {todayWorkout.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">今日訓練菜單</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={saveAsNewPlan}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1 justify-center"
                  >
                    <Save size={16} /> 存為計劃
                  </button>
                  <button
                    onClick={saveTodayWorkout}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 justify-center"
                  >
                    <Save size={16} />
                    儲存今日
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {todayWorkout.map(record => (
                  <div key={record.id} className={`p-4 rounded-lg border-2 transition-colors duration-200 ${
                    record.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={record.completed}
                          onChange={() => toggleCompleted(record.id)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">{record.exerciseName}</div>
                          <div className="text-sm text-gray-600">{record.category}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTodayWorkout(todayWorkout.filter(w => w.id !== record.id))}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full"
                        title="刪除訓練記錄"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">重量(kg)</label>
                        <input
                          type="number"
                          value={record.weight || ''}
                          onChange={(e) => updateWorkoutRecord(record.id, 'weight', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">組數</label>
                        <input
                          type="number"
                          value={record.sets || ''}
                          onChange={(e) => updateWorkoutRecord(record.id, 'sets', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">次數</label>
                        <input
                          type="number"
                          value={record.reps || ''}
                          onChange={(e) => updateWorkoutRecord(record.id, 'reps', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {todayWorkout.length === 0 && !showHistory && (
            <div className="text-center text-gray-500 mt-10">
              <p>今日訓練列表為空，請新增或載入計劃。</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  // 渲染訓練動作頁面
  const renderExercises = () => (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">訓練動作管理</h1>
      
      {/* 如果正在查看或編輯動作詳情，則顯示相應的介面 */}
      {viewingExerciseDetails || editingExercise ? (
        <div className="fixed inset-0 bg-white bg-opacity-95 z-50 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 border-b pb-4 sticky top-0 bg-white z-10">
            <button 
              onClick={() => {
                setViewingExerciseDetails(null);
                setEditingExercise(null);
              }} 
              className="p-2 rounded-full hover:bg-gray-100"
              title="返回動作列表"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingExercise ? '編輯動作' : (viewingExerciseDetails ? viewingExerciseDetails.name : '動作詳情')}
            </h2>
            {editingExercise ? (
              <button 
                onClick={() => updateExercise(editingExercise)} 
                className="text-blue-600 font-semibold px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors flex items-center gap-1"
              >
                <Save size={20} /> 儲存
              </button>
            ) : (
              viewingExerciseDetails && ( // 只有在查看詳情時才顯示編輯按鈕
                <button 
                  onClick={() => setEditingExercise(viewingExerciseDetails)} 
                  className="text-blue-600 font-semibold px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <Edit size={20} /> 編輯
                </button>
              )
            )}
          </div>

          {editingExercise ? (
            // 編輯動作介面
            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">動作名稱</label>
                <input
                  type="text"
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部位</label>
                <select
                  value={editingExercise.category}
                  onChange={(e) => setEditingExercise({ ...editingExercise, category: e.target.value, muscle: e.target.value.toLowerCase() })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="胸部">胸部</option>
                  <option value="背部">背部</option>
                  <option value="肩膀">肩膀</option>
                  <option value="手臂">手臂</option>
                  <option value="腿部">腿部</option>
                  <option value="核心">核心</option>
                  {[...new Set(exercises.map(ex => ex.category))].filter(cat => !['胸部', '背部', '肩膀', '手臂', '腿部', '核心'].includes(cat)).map(category => (
                      <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作說明</label>
                <textarea
                  value={editingExercise.description || ''}
                  onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="詳細說明此動作的操作方式..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">建議器材</label>
                <textarea
                  value={editingExercise.equipmentSuggestions || ''}
                  onChange={(e) => setEditingExercise({ ...editingExercise, equipmentSuggestions: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="建議使用哪些器材 (例如: 啞鈴, 繩索機)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">自由重量操作方式</label>
                <textarea
                  value={editingExercise.freeWeightInstructions || ''}
                  onChange={(e) => setEditingExercise({ ...editingExercise, freeWeightInstructions: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="如果使用自由重量，操作方式有何不同..."
                />
              </div>
            </div>
          ) : (
            // 動作詳情介面
            viewingExerciseDetails && (
            <div className="space-y-4 pt-4 text-gray-800">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">部位:</div>
                <p>{viewingExerciseDetails.category}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">主要肌肉:</div>
                <p>{viewingExerciseDetails.muscle}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">操作說明:</div>
                <p className="whitespace-pre-wrap">{viewingExerciseDetails.description || '無詳細說明'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">建議器材:</div>
                <p className="whitespace-pre-wrap">{viewingExerciseDetails.equipmentSuggestions || '無建議器材'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">自由重量操作方式:</div>
                <p className="whitespace-pre-wrap">{viewingExerciseDetails.freeWeightInstructions || '無自由重量操作方式說明'}</p>
              </div>
            </div>
            )
          )}
        </div>
      ) : (
        <>
          {/* 新增自訂動作 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">新增自訂動作</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="動作名稱"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
              />
              
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newExerciseCategory}
                onChange={(e) => setNewExerciseCategory(e.target.value)}
              >
                <option value="">選擇部位</option>
                <option value="胸部">胸部</option>
                <option value="背部">背部</option>
                <option value="肩膀">肩膀</option>
                <option value="手臂">手臂</option>
                <option value="腿部">腿部</option>
                <option value="核心">核心</option>
                {[...new Set(exercises.map(ex => ex.category))].filter(cat => !['胸部', '背部', '肩膀', '手臂', '腿部', '核心'].includes(cat)).map(category => (
                    <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <textarea
                placeholder="操作說明 (可選)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                value={newExerciseDescription}
                onChange={(e) => setNewExerciseDescription(e.target.value)}
              />
              <textarea
                placeholder="建議器材 (可選)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
                value={newExerciseEquipment}
                onChange={(e) => setNewExerciseEquipment(e.target.value)}
              />
              <textarea
                placeholder="自由重量操作方式 (可選)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20"
                value={newExerciseFreeWeight}
                onChange={(e) => setNewExerciseFreeWeight(e.target.value)}
              />

              <button
                onClick={addCustomExercise}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                新增動作
              </button>
            </div>
          </div>
          
          {/* 動作列表 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">所有訓練動作</h2>
            {/* 部位篩選選單 */}
            <div className="mb-4">
              <label htmlFor="exercise-filter-category" className="block text-sm font-medium text-gray-700 mb-2">
                篩選部位
              </label>
              <select
                id="exercise-filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">所有部位</option>
                {[...new Set(exercises.map(ex => ex.category))].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {
                (selectedCategory ? [selectedCategory] : [...new Set(exercises.map(ex => ex.category))])
                  .sort()
                  .map(category => (
                  <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="text-md font-semibold mb-3 text-gray-800">{category}</h3>
                    <div className="grid grid-cols-1 gap-2"> {/* Changed to col-1 for better layout with buttons */}
                      {exercises.filter(ex => ex.category === category).map(exercise => (
                        <div key={exercise.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
                          <span className="text-gray-800 font-medium">{exercise.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewingExerciseDetails(exercise)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                              title="查看詳情"
                            >
                              <Info size={16} />
                            </button>
                            <button
                              onClick={() => setEditingExercise(exercise)}
                              className="p-2 bg-yellow-100 text-yellow-600 rounded-md hover:bg-yellow-200 transition-colors"
                              title="編輯動作"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteExercise(exercise.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                              title="刪除動作"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
              {getFilteredExercises().length === 0 && (
                  <div className="text-center text-gray-500 mt-5">
                    <p>該部位暫無動作。</p>
                  </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // 渲染訓練計劃頁面
  const renderPlans = () => (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">訓練計劃</h1>
      
      {/* 創建新計劃 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">創建新計劃</h2>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="計劃名稱 (例如: 胸背日)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
          
          {/* 篩選動作的部位選單 */}
          <div className="mb-2">
            <label htmlFor="plan-creation-category-select" className="block text-sm font-medium text-gray-700 mb-2">
              篩選動作部位
            </label>
            <select
              id="plan-creation-category-select"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
            >
              <option value="">所有部位</option>
              {[...new Set(exercises.map(ex => ex.category))].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
            <div className="text-sm text-gray-600 mb-2">選擇動作：</div>
            {getFilteredExercises().length === 0 ? (
              <p className="text-center text-gray-500">該部位暫無動作可供選擇。</p>
            ) : (
              getFilteredExercises().map(exercise => (
                <label key={exercise.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md px-2">
                  <input
                    type="checkbox"
                    checked={selectedPlanExercises.includes(exercise.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlanExercises([...selectedPlanExercises, exercise.id]);
                      } else {
                        setSelectedPlanExercises(selectedPlanExercises.filter(id => id !== exercise.id));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">{exercise.name} <span className="text-xs text-gray-500">({exercise.category})</span></span>
                </label>
              ))
            )}
          </div>
          
          <button
            onClick={createWorkoutPlan}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            創建計劃
          </button>
        </div>
      </div>
      
      {/* 已創建的計劃列表 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">我的訓練計劃</h2>
        
        {/* 搜尋歷史計劃 */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="搜尋計劃名稱..."
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={planSearchQuery}
            onChange={(e) => setPlanSearchQuery(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {workoutPlans
          .filter(plan => plan.name.toLowerCase().includes(planSearchQuery.toLowerCase()))
          .length === 0 && (
            <div className="text-center text-gray-500 mt-5">
              <p>沒有符合條件的訓練計劃。</p>
            </div>
          )}

        <div className="space-y-4">
          {workoutPlans
            .filter(plan => plan.name.toLowerCase().includes(planSearchQuery.toLowerCase()))
            .sort((a, b) => {
              const dateA = new Date(a.createdDate);
              const dateB = new Date(b.createdDate);
              return dateB - dateA;
            })
            .map(plan => (
            <div 
              key={plan.id} 
              className="bg-gray-50 rounded-xl shadow-sm p-4 border border-gray-100 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setEditingPlan(plan);
                setSelectedCategory('');
              }}
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{plan.name}</h3>
                <span className="text-sm text-gray-500">{plan.exercises.length} 個動作</span>
                <span className="text-xs text-gray-400 ml-2">創建於: {plan.createdDate}</span>
              </div>
              <ChevronRight size={20} className="text-gray-500" />
            </div>
          ))}
        </div>
      </div>

      {/* 編輯計劃介面 (Modal-like) */}
      {editingPlan && (
        <div className="fixed inset-0 bg-white bg-opacity-95 z-50 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 border-b pb-4 sticky top-0 bg-white z-10">
            <button 
              onClick={() => {
                setEditingPlan(null);
                setSelectedCategory('');
              }} 
              className="p-2 rounded-full hover:bg-gray-100"
              title="返回計劃列表"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">{editingPlan.name}</h2>
            <button 
              onClick={() => {
                  updateEditingPlan(editingPlan);
                  setEditingPlan(null);
              }} 
              className="text-blue-600 font-semibold px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors flex items-center gap-1"
            >
              <Save size={20} /> 儲存
            </button>
          </div>

          <div className="space-y-4 pt-4">
            {editingPlan.exercises.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <p>此計劃沒有動作。</p>
              </div>
            )}
            {editingPlan.exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold text-lg text-gray-800">{exercise.name}</div>
                  <button
                    onClick={() => {
                      const updatedExercises = editingPlan.exercises.filter(ex => ex.id !== exercise.id);
                      setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                      showCustomAlert(`${exercise.name} 已從計劃中移除。`, 'exercise-removed-from-plan');
                    }}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full"
                    title="從計劃中移除此動作"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-3">{exercise.category}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">建議重量 (kg)</label>
                    <input
                      type="number"
                      value={exercise.weight || ''}
                      onChange={(e) => {
                        const newWeight = parseFloat(e.target.value) || 0;
                        const updatedExercises = [...editingPlan.exercises];
                        updatedExercises[index] = { ...exercise, weight: newWeight };
                        setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">組數</label>
                    <input
                      type="number"
                      value={exercise.sets || ''}
                      onChange={(e) => {
                        const newSets = parseInt(e.target.value) || 0;
                        const updatedExercises = [...editingPlan.exercises];
                        updatedExercises[index] = { ...exercise, sets: newSets };
                        setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">次數</label>
                    <input
                      type="number"
                      value={exercise.reps || ''}
                      onChange={(e) => {
                        const newReps = parseInt(e.target.value) || 0;
                        const updatedExercises = [...editingPlan.exercises];
                        updatedExercises[index] = { ...exercise, reps: newReps };
                        setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            ))}
            {/* 新增動作到編輯中的計劃 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">新增動作到此計劃</h3>
              <div className="space-y-4">
                {/* 篩選動作的部位選單 */}
                <div className="mb-2">
                  <label htmlFor="edit-plan-add-exercise-category" className="block text-sm font-medium text-gray-700 mb-2">
                    篩選動作部位
                  </label>
                  <select
                    id="edit-plan-add-exercise-category"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                    }}
                  >
                    <option value="">所有部位</option>
                    {[...new Set(exercises.map(ex => ex.category))].map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-2">選擇動作：</div>
                  {getFilteredExercises().length === 0 ? (
                    <p className="text-center text-gray-500">該部位暫無動作可供選擇。</p>
                  ) : (
                    getFilteredExercises()
                      // 篩選掉已在計劃中的動作
                      .filter(ex => !editingPlan.exercises.some(planEx => planEx.id === ex.id)) 
                      .map(exercise => (
                        <label key={exercise.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md px-2">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => {
                              const updatedExercises = [
                                ...editingPlan.exercises,
                                {
                                  ...exercise,
                                  weight: 0,
                                  sets: 0,
                                  reps: 0
                                }
                              ];
                              setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                              showCustomAlert(`${exercise.name} 已新增到計劃。`, 'exercise-added-to-plan');
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">{exercise.name} <span className="text-xs text-gray-500">({exercise.category})</span></span>
                        </label>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染進度追蹤頁面
  const renderProgress = () => (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">進度追蹤</h1>
      
      {/* 身體數據輸入 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">記錄身體數據</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <input
            type="number"
            placeholder="體重(kg)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="肌肉重(kg)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={muscleWeight}
            onChange={(e) => setMuscleWeight(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="脂肪重(kg)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={fatWeight}
            onChange={(e) => setFatWeight(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="體脂率(%)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={bodyFatPercent}
            onChange={(e) => setBodyFatPercent(e.target.value)}
            min="0"
            max="100"
          />
        </div>
        
        <button
          onClick={addBodyStats}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          記錄數據
        </button>
      </div>
      
      {/* 統計視圖切換 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            {[
              { key: 'week', label: '週' },
              { key: 'month', label: '月' },
              { key: 'year', label: '年' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatsView(key)}
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  statsView === key 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* 統計數據顯示 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{stats.workoutDays}</div>
            <div className="text-sm text-gray-600">總運動天數</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
            <div className="text-2xl font-bold text-green-600">{stats.completedExercises}</div>
            <div className="text-sm text-gray-600">完成項目</div>
          </div>
        </div>
        
        {/* 部位訓練統計 */}
        <h3 className="text-lg font-semibold mb-3 text-gray-800">部位訓練統計 (總組數)</h3>
        {Object.entries(stats.categoryStats).length === 0 && (
          <div className="text-center text-gray-500 mt-5">
            <p>目前沒有部位訓練統計數據。</p>
          </div>
        )}
        <div className="space-y-2 mb-6">
          {Object.entries(stats.categoryStats)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([category, count]) => (
            <div key={category} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-800">{category}動作</span>
              <span className="text-blue-600 font-semibold">{count} 組</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 身體數據歷史 */}
      {bodyStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">身體數據記錄</h3>
          <div className="space-y-2">
            {bodyStats.sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateB - dateA;
            }).slice(0, 5).map(stat => (
              <div key={stat.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{stat.date}</span>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-800">{stat.weight}kg</span>
                    {stat.bodyFatPercent && (
                      <span className="ml-2 text-gray-600">體脂率: {stat.bodyFatPercent}%</span>
                    )}
                    {stat.muscleWeight && (
                      <span className="ml-2 text-gray-600">肌肉: {stat.muscleWeight}kg</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {bodyStats.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          <p>目前沒有身體數據記錄。</p>
        </div>
      )}
    </div>
  );

  // 渲染計時器頁面
  const renderTimer = () => (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">組間計時器</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
        {/* 時間設定滑動條 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            設定休息時間
          </label>
          <div className="flex items-center justify-center gap-4">
            <span className="text-lg font-semibold min-w-10 text-gray-800">
              {formatTime(timerSeconds)}
            </span>
            <input
              type="range"
              min="15" // 最小15秒
              max="360" // 最大6分鐘 (360秒)
              step="5" // 每5秒一個步進
              value={timerSeconds}
              onChange={(e) => {
                if (!isTimerRunning) {
                  const newTime = parseInt(e.target.value);
                  setTimerSeconds(newTime);
                  setTimerDisplay(newTime);
                }
              }}
              className="w-2/3 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer range-lg"
              disabled={isTimerRunning}
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(timerSeconds - 15) / (360 - 15) * 100}%, #E0E7FF ${(timerSeconds - 15) / (360 - 15) * 100}%, #E0E7FF 100%)`
              }}
            />
          </div>
        </div>
        
        {/* 計時器顯示 */}
        <div className="mb-8">
          <div className={`text-6xl font-bold mb-4 transition-colors duration-500 ${
            timerDisplay <= 10 && timerDisplay > 0 ? 'text-red-500 animate-pulse' : 'text-blue-600'
          } ${timerDisplay === 0 ? 'text-green-600' : ''}`}>
            {formatTime(timerDisplay)}
          </div>
          
          {/* 進度條 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ease-linear ${
                timerDisplay <= 10 && timerDisplay > 0 ? 'bg-red-500' : 'bg-blue-600'
              } ${timerDisplay === 0 ? 'bg-green-600' : ''}`}
              style={{ width: `${(timerDisplay / timerSeconds) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* 控制按鈕 */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setIsTimerRunning(!isTimerRunning);
            }}
            className={`px-8 py-4 rounded-xl font-semibold flex items-center gap-2 transition-colors duration-200 shadow-md 
              ${isTimerRunning 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isTimerRunning ? <Pause size={24} /> : <Play size={24} />}
            {isTimerRunning ? '暫停' : '開始'}
          </button>
          
          <button
            onClick={() => {
              setIsTimerRunning(false);
              setTimerDisplay(timerSeconds);
            }}
            className="px-8 py-4 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors duration-200 shadow-md flex items-center gap-2"
          >
            <RotateCcw size={24} />
            重置
          </button>
        </div>
        
        {/* 快速設定按鈕 */}
        <div className="mt-8">
          <div className="text-sm text-gray-600 mb-3">快速設定</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {[30, 60, 90, 120, 180, 240, 300].map(seconds => ( // 新增30秒選項
              <button
                key={seconds}
                onClick={() => {
                  if (!isTimerRunning) {
                    setTimerSeconds(seconds);
                    setTimerDisplay(seconds);
                  }
                }}
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isTimerRunning}
              >
                {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans">
      {/* 主要內容區域 */}
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl relative">
        {/* 頁面內容 */}
        {currentPage === 'daily' && renderDailyWorkout()}
        {currentPage === 'exercises' && renderExercises()}
        {currentPage === 'plans' && renderPlans()}
        {currentPage === 'progress' && renderProgress()}
        {currentPage === 'timer' && renderTimer()}
        
        {/* 底部導航 */}
        {renderBottomNav()}

        {/* 自定義提示框 */}
        {showAlert && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-3 rounded-lg shadow-xl text-center z-50 animate-fade-in-up">
            {alertMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default App; // 導出元件名稱為 App
