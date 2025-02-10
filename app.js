let db;
let currentUser = null;
let score = 0;
let clickValue = 1;

// Инициализация SQL.js
async function initSQLite() {
    const SQL = await initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
    });

    // Загрузка базы данных из localStorage
    let dbData;
    const savedDB = localStorage.getItem("clickerDB");
    if (savedDB) {
        dbData = new Uint8Array(JSON.parse(savedDB));
    }

    // Создание или загрузка базы данных
    db = new SQL.Database(dbData);

    // Создание таблицы пользователей, если её нет
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            score INTEGER DEFAULT 0,
            clickValue INTEGER DEFAULT 1
        )
    `);

    console.log("База данных инициализирована.");
}

// Сохранение базы данных в localStorage
function saveDB() {
    const data = db.export();
    localStorage.setItem("clickerDB", JSON.stringify(Array.from(data)));
}

// Регистрация
function register(username, password) {
    try {
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);
        saveDB();
        return true;
    } catch (err) {
        console.error("Ошибка при регистрации:", err.message);
        return false;
    }
}

// Вход
function login(username, password) {
    const result = db.exec("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
    if (result.length > 0) {
        return result[0].values[0]; // Возвращаем первого пользователя
    }
    return null;
}

// Обновление счета
function updateScore(userId, score, clickValue) {
    db.run("UPDATE users SET score = ?, clickValue = ? WHERE id = ?", [score, clickValue, userId]);
    saveDB();
}

// Форматирование чисел
function formatNumber(number) {
    if (number >= 1e9) return (number / 1e9).toFixed(1) + " млрд";
    if (number >= 1e6) return (number / 1e6).toFixed(1) + " млн";
    if (number >= 1e3) return (number / 1e3).toFixed(1) + " тыс";
    return number;
}

// Обновление отображения счета
function updateScoreDisplay() {
    document.getElementById("score").textContent = `Счет: ${formatNumber(score)}`;
}

// Обновление отображения очков за клик
function updateClickValueDisplay() {
    document.getElementById("click-value").textContent = `+${formatNumber(clickValue)}`;
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
    updateScoreDisplay();
    updateClickValueDisplay();
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
    const user = login(username, password);
    if (user) {
        currentUser = {
            id: user[0],
            username: user[1],
            password: user[2],
            score: user[3],
            clickValue: user[4],
        };
        score = currentUser.score;
        clickValue = currentUser.clickValue;
        showClickerScreen();
    } else {
        document.getElementById("login-error").style.display = "block";
    }
});

document.getElementById("register-submit-btn").addEventListener("click", () => {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const success = register(username, password);
    if (success) {
        showMainScreen();
    } else {
        document.getElementById("register-error").style.display = "block";
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    showMainScreen();
});

// Логика кликера
document.getElementById("coin").addEventListener("click", () => {
    score += clickValue;
    updateScoreDisplay();
    if (currentUser) {
        updateScore(currentUser.id, score, clickValue);
    }
});

// Магазин улучшений
const upgrades = [
    { id: 1, name: "Улучшение клика +1", cost: 10, value: 1 },
    { id: 2, name: "Улучшение клика +5", cost: 50, value: 5 },
    { id: 3, name: "Улучшение клика +10", cost: 100, value: 10 },
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
        updateClickValueDisplay();
        if (currentUser) {
            updateScore(currentUser.id, score, clickValue);
        }
        renderUpgrades();
    } else {
        alert("Недостаточно средств!");
    }
}

// Проверка авторизации при загрузке страницы
async function checkAuth() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const result = db.exec("SELECT * FROM users WHERE id = ?", [currentUser.id]);
        if (result.length > 0) {
            const user = result[0].values[0];
            currentUser = {
                id: user[0],
                username: user[1],
                password: user[2],
                score: user[3],
                clickValue: user[4],
            };
            score = currentUser.score;
            clickValue = currentUser.clickValue;
            showClickerScreen();
        }
    }
}

// Инициализация
(async () => {
    await initSQLite();
    checkAuth();
})();