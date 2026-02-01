import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCws_6NJHCrjoTs-QcUGUXwlDR-Kdr90bg",
  authDomain: "kura-star.firebaseapp.com",
  projectId: "kura-star",
  storageBucket: "kura-star.firebasestorage.app",
  messagingSenderId: "1026378860573",
  appId: "1:1026378860573:web:4825af6eb301a1e5ee9ef4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let items = [];
let currentA = null;
let currentB = null;

async function init() {
    const status = document.getElementById('status');
    try {
        // 1. GLOBAL RESET CHECK
        const setSnap = await getDoc(doc(db, "settings", "voting"));
        if (setSnap.exists()) {
            const globalVer = setSnap.data().version;
            const localVer = localStorage.getItem('vVer');
            if (localVer !== globalVer.toString()) {
                localStorage.removeItem('vCount'); // Wipe votes if new round started
                localStorage.setItem('vVer', globalVer);
            }
        }

        // 2. DATA LOAD / AUTO-SETUP
        const snap = await getDocs(collection(db, "students"));
        if (snap.empty) {
            status.innerText = "Setup: Creating 1-30...";
            for (let i = 1; i <= 30; i++) {
                await setDoc(doc(db, "students", i.toString()), { id: i, rating: 1000 });
            }
            await setDoc(doc(db, "settings", "voting"), { version: Date.now() });
            location.reload(); 
        } else {
            status.innerText = "";
            items = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
            
            const votes = parseInt(localStorage.getItem('vCount')) || 0;
            document.getElementById('vote-count').innerText = `Votes: ${votes} / 30`;

            if (votes >= 30) {
                document.getElementById('vote-area').style.display = "none";
                document.getElementById('finish-section').style.display = "block";
                renderRanking(); 
            } else {
                renderVote();
            }
        }
    } catch (err) {
        status.innerText = "Connection Error. See Console.";
        console.error(err);
    }
}

async function handleVote(winner, loser) {
    let v = (parseInt(localStorage.getItem('vCount')) || 0) + 1;
    localStorage.setItem('vCount', v);

    const K = 32;
    const exp = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    
    await updateDoc(doc(db, "students", winner.firestoreId), { rating: winner.rating + K * (1 - exp) });
    await updateDoc(doc(db, "students", loser.firestoreId), { rating: loser.rating + K * (0 - (1 - exp)) });

    init(); 
}

function renderVote() {
    let a = Math.floor(Math.random() * items.length);
    let b;
    do { b = Math.floor(Math.random() * items.length); } while (a === b);
    currentA = items[a]; currentB = items[b];
    document.getElementById("btnA").textContent = "Number " + currentA.id;
    document.getElementById("btnB").textContent = "Number " + currentB.id;
}

async function renderRanking() {
    const q = query(collection(db, "students"), orderBy("rating", "desc"), limit(5));
    const snap = await getDocs(q);
    const list = document.getElementById("ranking");
    list.innerHTML = "";
    let rank = 1;
    snap.forEach(d => {
        const item = d.data();
        list.innerHTML += `<li><b>${rank++}.</b> Number ${item.id} — ${Math.round(item.rating)}</li>`;
    });
}

// --- ADMIN RESET (WITH GLOBAL RESET) ---
document.getElementById("reset-db").onclick = async () => {
    const pw = prompt("Admin Password:");
    if (pw === "enhujin") { 
        if (confirm("Reset ALL scores and let EVERYONE vote again?")) {
            for (let i = 1; i <= 30; i++) {
                await updateDoc(doc(db, "students", i.toString()), { rating: 1000 });
            }
            const newVersion = Date.now();
            await setDoc(doc(db, "settings", "voting"), { version: newVersion });
            localStorage.setItem('vVer', newVersion);
            localStorage.removeItem('vCount');
            alert("System Reset Complete!");
            location.reload();
        }
    } else { alert("Access Denied."); }
};

document.getElementById("btnA").onclick = () => handleVote(currentA, currentB);
document.getElementById("btnB").onclick = () => handleVote(currentB, currentA);

init();