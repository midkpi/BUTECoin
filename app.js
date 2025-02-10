// Инициализация IndexedDB
let db;
const DB_NAME = "ClickerDB";
const STORE_NAME = "users";

const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "username" });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    checkAuth();
    updateScoreFromDB();
};

request.onerror = (event) => {
    console.error("Ошибка при открытии базы данных:", event.target.error);
};

// Функции для работы с базой данных
function addUser(username, password) {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ username, password, score: 0, upgrades: [] });

    request.onsuccess = () => {
        console.log("Пользователь зарегистрирован:", username);
    };

    request.onerror = (event) => {
        console.error("Ошибка при регистрации:", event.target.error);
    };
}

function getUser(username, callback) {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(username);

    request.onsuccess = () => {
        callback(request.result);
    };

    request.onerror = (event) => {
        console.error("Ошибка при получении пользователя:", event.target.error);
    };
}

function updateUser(user) {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(user);
}

// Логика авторизации
let currentUser = null;

function checkAuth() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showClickerScreen();
    }
}

function login(username, password) {
    getUser(username, (user) => {
        if (user && user.password === password) {
            currentUser = user;
            localStorage.setItem("currentUser", JSON.stringify(user));
            showClickerScreen();
        } else {
            document.getElementById("login-error").style.display = "block";
        }
    });
}

function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    showMainScreen();
}

// Логика интерфейса
function showMainScreen() {
    document.getElementById("main-screen").style.display = "block";
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("register-screen").style.display = "none";
    document.getElementById("clicker-screen").style.display = "none";
}

function showLoginScreen() {
    document.getElementById("main-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
    document.getElementById("register-screen").style.display = "none";
    document.getElementById("clicker-screen").style.display = "none";
}

function showRegisterScreen() {
    document.getElementById("main-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("register-screen").style.display = "block";
    document.getElementById("clicker-screen").style.display = "none";
}

function showClickerScreen() {
    document.getElementById("main-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("register-screen").style.display = "none";
    document.getElementById("clicker-screen").style.display = "block";
    updateScoreFromDB();
    renderUpgrades();
}

// Обработчики событий
document.getElementById("login-btn").addEventListener("click", showLoginScreen);
document.getElementById("register-btn").addEventListener("click", showRegisterScreen);

document.getElementById("back-to-main-from-login").addEventListener("click", showMainScreen);
document.getElementById("back-to-main-from-register").addEventListener("click", showMainScreen);

document.getElementById("login-submit-btn").addEventListener("click", () => {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    login(username, password);
});

document.getElementById("register-submit-btn").addEventListener("click", () => {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    addUser(username, password);
    showMainScreen();
});

document.getElementById("logout-btn").addEventListener("click", logout);

// Логика кликера
let score = 0;
let clickValue = 1; // Количество очков за клик

document.getElementById("coin").addEventListener("click", () => {
    score += clickValue;
    updateScoreDisplay();
    saveScore();
});

function updateClickValueDisplay() {
    document.getElementById("click-value").textContent = `+${formatNumber(clickValue)}`;
}

function updateScoreDisplay() {
    document.getElementById("score").textContent = `Счет: ${formatNumber(score)}`;
}

function saveScore() {
    if (currentUser) {
        currentUser.score = score;
        updateUser(currentUser);
    }
}

function updateScoreFromDB() {
    if (currentUser) {
        getUser(currentUser.username, (user) => {
            if (user) {
                score = user.score || 0;
                clickValue = user.clickValue || 1;
                updateScoreDisplay();
            }
        });
    }
}

// Форматирование чисел
function formatNumber(number) {
    if (number >= 1e9) return (number / 1e9).toFixed(1) + "KKK";
    if (number >= 1e6) return (number / 1e6).toFixed(1) + "KK";
    if (number >= 1e3) return (number / 1e3).toFixed(1) + "K";
    return number;
}

// Магазин улучшений
const upgrades = [
    { id: 1, name: "Улучшение клика +1", cost: 100, value: 1 },
    { id: 2, name: "Улучшение клика +5", cost: 500, value: 5 },
    { id: 3, name: "Улучшение клика +10", cost: 1000, value: 10 },
    { id: 4, name: "Улучшение клика +100", cost: 10000, value: 100 },
    { id: 5, name: "Улучшение клика +1K", cost: 100000, value: 1000 },
    { id: 6, name: "Улучшение клика +10K", cost: 1000000, value: 10000 },
];

function renderUpgrades() {
    const upgradesList = document.getElementById("upgrades-list");
    upgradesList.innerHTML = "";

    upgrades.forEach(upgrade => {
        const upgradeElement = document.createElement("div");
        upgradeElement.className = "upgrade";
        upgradeElement.innerHTML = `
            <span>${upgrade.name} (Цена: ${formatNumber(upgrade.cost)})</span>
            <button onclick="buyUpgrade(${upgrade.id})">Купить</button>
        `;
        upgradesList.appendChild(upgradeElement);
    });
}

function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (score >= upgrade.cost) {
        score -= upgrade.cost;
        clickValue += upgrade.value;
        updateScoreDisplay();
        updateClickValueDisplay(); // Обновляем отображение
        saveScore();
        if (currentUser) {
            currentUser.clickValue = clickValue;
            updateUser(currentUser);
        }
        renderUpgrades();
    } else {
        alert("Недостаточно средств!");
    }
}

function updateScoreFromDB() {
    if (currentUser) {
        getUser(currentUser.username, (user) => {
            if (user) {
                score = user.score || 0;
                clickValue = user.clickValue || 1;
                updateScoreDisplay();
                updateClickValueDisplay(); // Обновляем отображение при загрузке
            }
        });
    }
}