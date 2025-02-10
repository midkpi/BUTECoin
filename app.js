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
    updateScoreFromDB(); // Загружаем счет из базы данных
};

request.onerror = (event) => {
    console.error("Ошибка при открытии базы данных:", event.target.error);
};

// Функции для работы с базой данных
function addUser(username, password) {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ username, password, score: 0 });

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
    updateScoreFromDB(); // Обновляем счет при показе экрана кликера
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

document.getElementById("coin").addEventListener("click", () => {
    score++;
    document.getElementById("score").textContent = `Счет: ${score}`;

    // Сохраняем счет в базе данных
    if (currentUser) {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.put({ ...currentUser, score });
    }
});

function updateScoreFromDB() {
    if (currentUser) {
        getUser(currentUser.username, (user) => {
            if (user) {
                score = user.score || 0;
                document.getElementById("score").textContent = `Счет: ${score}`;
            }
        });
    }
}
