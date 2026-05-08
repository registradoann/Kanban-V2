let userStatusStart = {}; 
// { "Juvy": timestamp, "Jenny": timestamp }

if (!localStorage.getItem("loggedIn")) {
    window.location.href = "login.html";
}

// ===== GLOBAL VARIABLES =====
let draggedCard = null;
let pendingMove = null;
let originalColumn = null;
let originalNextSibling = null;
let activeCard = null;


// ===== DOM READY =====
document.addEventListener("DOMContentLoaded", function () {

    // ===== SEARCH BAR =====
    const input = document.querySelector('.header-bar input');
    if (input) {
        input.addEventListener('input', function(){
            this.classList.toggle('has-value', this.value.trim() !== '');
        });
    }

    // ===== ICONS =====
    lucide.createIcons();

    // ===== DRAG SYSTEM =====
    document.querySelectorAll('.kanban-card').forEach(card => {

        card.addEventListener('dragstart', function () {
            draggedCard = this;

            originalColumn = this.parentElement;
            originalNextSibling = this.nextElementSibling;

            this.classList.add('dragging');
        });

        card.addEventListener('dragend', function () {
            this.classList.remove('dragging');
        });

    });

    // ===== SF VALIDATION =====
    const sfInput = document.getElementById('modalSF');

    if (sfInput) {
        sfInput.addEventListener('input', function () {

            if (this.value === '') {
                this.style.borderColor = '#ccc';
                return;
            }

            if (validateSFLink(this.value)) {
                this.style.borderColor = 'green';
            } else {
                this.style.borderColor = 'red';
            }

        });
    }

    // ===== PROFILE IMAGE PREVIEW =====
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('profileImage').src = URL.createObjectURL(file);
            }
        });
    }

    // ===== MINI KANBAN CLICK (VIEW ONLY MODE) =====
    document.addEventListener("click", function(e) {
        const miniCard = e.target.closest(".mini-card");

        if (!miniCard) return;

        e.stopPropagation();

        const id = miniCard.dataset.id;

        const realCard = document.querySelector(
            `.kanban-card[data-id="${id}"]`
        );

        if (realCard) {
            openCardModal(realCard, true); // 👈 VIEW ONLY MODE
        } else {
            console.warn("No matching card found for:", id);
        }
    });

});


// ===== SIDEBAR =====
function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("collapsed");
}

function showScreen(screenId, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
}


// ===== DRAG LOGIC =====
function allowDrop(e) {
    e.preventDefault();

    const column = e.currentTarget;

    if (column.classList.contains('not-task')) return;

    moveCard(column, e.clientY);
}

function drop(e) {
    e.preventDefault();

    const column = e.currentTarget;
    const statusName = column.querySelector('.column-header').innerText;

    if (column.classList.contains('not-task')) {
        pendingMove = {
            column: column,
            y: e.clientY,
            status: statusName
        };

        document.getElementById('confirmModal').classList.remove('hidden');
        return false;
    }

    // NORMAL DROP
    moveCard(column, e.clientY);

    if (draggedCard) {
        draggedCard.dataset.status = statusName; // 🔥 ADD THIS
    }
}

// ===== MOVE LOGIC =====
function moveCard(column, y) {
    const afterElement = getDragAfterElement(column, y);

    if (!afterElement) {
        column.appendChild(draggedCard);
    } else {
        column.insertBefore(draggedCard, afterElement);
    }
}


// ===== FIND INSERT POSITION =====
function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.kanban-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


// ===== CONFIRM MODAL =====
function confirmMove() {
    if (pendingMove && draggedCard) {
        moveCard(pendingMove.column, pendingMove.y);

        draggedCard.dataset.status = pendingMove.status; // 🔥 ADD THIS
    }
    closeConfirmModal();
}

function cancelMove() {
    if (draggedCard && originalColumn) {
        if (originalNextSibling) {
            originalColumn.insertBefore(draggedCard, originalNextSibling);
        } else {
            originalColumn.appendChild(draggedCard);
        }
    }
    closeConfirmModal();
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
    pendingMove = null;
}


// ===== STATUS DROPDOWN =====
function populateStatusDropdown(card) {
    const currentColumn = card.closest('.kanban-column');
    const currentName = currentColumn.querySelector('.column-header').innerText;

    const dropdown = document.getElementById('modalStatus');
    dropdown.innerHTML = '';

    document.querySelectorAll('.kanban-column').forEach(col => {
        const name = col.querySelector('.column-header').innerText;

        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;

        if (name === currentName) {
            option.selected = true; // 🔥 THIS FIXES SYNC
        }

        dropdown.appendChild(option);
    });
}


// ===== CARD MODAL =====
function openCardModal(card, viewOnly = false) {

    activeCard = card;

    const subject = card.querySelector('.card-subject')?.innerText || '';
    const requestor = card.querySelector('.card-requestor')?.innerText || '';
    const task = card.querySelector('.card-task')?.innerText || '';
    const assignee = card.querySelector('.assignee span')?.innerText || 'Unassigned';

    document.getElementById('modalSubject').value = subject;
    document.getElementById('modalFrom').value = requestor;
    document.getElementById('modalTask').value = task || "Certificate of Insurance";
    document.getElementById('modalUser').value = assignee;

    document.getElementById('modalTime').value = new Date().toLocaleString();
    document.getElementById('modalCC').value = '';
    document.getElementById('modalSF').value = '';

    document.getElementById('modalEmail').innerText = "This is the email body.....";

    populateStatusDropdown(card);

   const modal = document.getElementById('cardModal');
const actions = modal.querySelectorAll('.modal-actions');

actions.forEach(action => {
    if (viewOnly) {
        action.style.display = "none";
    } else {
        action.style.display = "flex";
    }
});

    document.getElementById('cardModal').classList.remove('hidden');
}

function closeCardModal() {
    document.getElementById('cardModal').classList.add('hidden');
}


// ===== SAVE CHANGES =====
function saveCardChanges() {

    if (!activeCard) return;

    const task = document.getElementById('modalTask').value;
    const user = document.getElementById('modalUser').value;
    const status = document.getElementById('modalStatus').value;
    const sfLink = document.getElementById('modalSF').value;

    let taskEl = activeCard.querySelector('.card-task');

    if (!taskEl && task) {
        taskEl = document.createElement('div');
        taskEl.className = 'card-task';
        activeCard.appendChild(taskEl);
    }

    if (taskEl) taskEl.innerText = task;

    const assigneeSpan = activeCard.querySelector('.assignee span');
    const assigneeDiv = activeCard.querySelector('.assignee');

    if (assigneeSpan) assigneeSpan.innerText = user;

    if (user === "Unassigned") {
        assigneeDiv.classList.add('unassigned');
    } else {
        assigneeDiv.classList.remove('unassigned');
    }

    if (status) {
        document.querySelectorAll('.kanban-column').forEach(col => {
            const name = col.querySelector('.column-header').innerText;
            if (name === status) col.appendChild(activeCard);
        });
    }

    activeCard.dataset.sf = sfLink;

    closeCardModal();
}


// ===== SF VALIDATION =====
function validateSFLink(value) {
    const pattern = /^https:\/\/evergreen-veruna\.lightning\.force\.com\/lightning\/r\/VRNA__Policy__c\/[a-zA-Z0-9]+\/view$/;
    return pattern.test(value);
}


// ===== REPLY MODAL =====
function openReplyModal(type) {

    if (!activeCard) return;

    const requestor = activeCard.querySelector('.card-requestor')?.innerText || '';
    const subject = activeCard.querySelector('.card-subject')?.innerText || '';
    const emailBody = document.getElementById('modalEmail').innerText || '';
    const cc = document.getElementById('modalCC')?.value || '';

    let to = '';
    let ccField = '';
    let bccField = '';
    let newSubject = '';

    if (type === 'reply') {
        to = requestor;
        ccField = '';
        bccField = '';
        newSubject = `RE: ${subject}`;
    }

    if (type === 'replyAll') {
        to = requestor;
        ccField = cc;
        bccField = '';
        newSubject = `RE: ${subject}`;
    }

    if (type === 'forward') {
        to = '';
        ccField = '';
        bccField = '';
        newSubject = `FW: ${subject}`;
    }

    document.getElementById('replyTo').value = to;
    document.getElementById('replyCC').value = ccField;
    document.getElementById('replyBCC').value = bccField;
    document.getElementById('replySubject').value = newSubject;

    document.getElementById('replyBody').value =
    type === 'forward'
    ? `---------- Forwarded message ----------

${emailBody}`
    : `Hi ${requestor},

${emailBody}

Best regards,`;

    document.getElementById('replyModal').classList.remove('hidden');
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.add('hidden');
}

function sendReply() {
    alert("Reply sent (simulated)");
    closeReplyModal();
}

function logoutUser() {

    const confirmLogout = confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    // For now (frontend only)
    alert("Logged out");

    // Future: redirect to login page
    // window.location.href = "login.html";

}

function openLogoutModal() {
    document.getElementById('logoutModal').classList.remove('hidden');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

function confirmLogout() {
    closeLogoutModal();

    localStorage.removeItem("loggedIn");

    window.location.href = "login.html";
}

let currentUser = "Juvy"; // TEMP (later dynamic)
let userPunchState = {};  // { user: "Break" | "Away" | "Non SQ" | null }

function setStatus(status) {
    userPunchState[currentUser] = status;

    userStatusStart[currentUser] = Date.now(); // 🔥 reset timer

    updateAllStatuses();
}
function clearStatus() {
    userPunchState[currentUser] = null;

    userStatusStart[currentUser] = Date.now(); // 🔥 new state start

    updateAllStatuses();
}

function finishTask() {
    const cards = document.querySelectorAll('.kanban-card');

    cards.forEach(card => {
        const assignee = card.querySelector('.assignee span')?.innerText;
        const column = card.closest('.kanban-column')
                          .querySelector('.column-header').innerText;

        if (assignee === currentUser && column === "In Progress") {
            const doneColumn = [...document.querySelectorAll('.kanban-column')]
                .find(col => col.querySelector('.column-header').innerText === "Done");

            if (doneColumn) doneColumn.appendChild(card);
        }
    });

    userStatusStart[currentUser] = Date.now(); // 🔥 reset after finishing

    updateAllStatuses();
}
function getUserActiveTasks(user) {
    const cards = document.querySelectorAll('.kanban-card');

    let count = 0;

    cards.forEach(card => {
        const assignee = card.querySelector('.assignee span')?.innerText;
        const column = card.closest('.kanban-column')
                          .querySelector('.column-header').innerText;

        if (assignee === user && column === "In Progress") {
            count++;
        }
    });

    return count;
}
function computeStatus(user) {
    const punch = userPunchState[user];
    const activeTasks = getUserActiveTasks(user);

    if (punch === "Break") return "Break";
    if (punch === "Away") return "Away";
    if (punch === "Non SQ") return "Non SQ";

    if (activeTasks > 0) return "Processing";

    return "Idle";
}
function refreshAgentStatus() {
    const users = ["Juvy", "Jenny", "Marix", "Mackie", "Alani"];

    const tbody = document.querySelector('.agent-status-table tbody');
    if (!tbody) return;

    tbody.innerHTML = "";

    users.forEach(user => {
        const status = computeStatus(user);

        tbody.innerHTML += `
            <tr>
                <td>${user}</td>
                <td>${status}</td>
                <td>--</td>
            </tr>
        `;
    });
}
function highlightActive(status) {
    document.querySelectorAll('.status-controls button')
        .forEach(btn => btn.classList.remove('active'));

    if (status) {
        document.querySelector(`button[onclick="setStatus('${status}')"]`)
            ?.classList.add('active');
    }
}

function updateUserStatusUI(user) {
    const status = computeStatus(user);

    const statusEl = document.getElementById(`status-${user}`);
    const durationEl = document.getElementById(`duration-${user}`);

    if (!statusEl) return;

    statusEl.innerText = status;

    statusEl.className = "status";

    if (status === "Processing") statusEl.classList.add("processing");
    if (status === "Break") statusEl.classList.add("break");
    if (status === "Away") statusEl.classList.add("away");
    if (status === "Non SQ") statusEl.classList.add("nonsq");
    if (status === "Idle") statusEl.classList.add("idle");

    // 🔥 TIMER UPDATE
    if (durationEl && userStatusStart[user]) {
        const elapsed = Date.now() - userStatusStart[user];
        durationEl.innerText = formatDuration(elapsed);
    }
}
function updateAllStatuses() {
    const users = ["Juvy", "Jenny", "Marix", "Mackie", "Alani"];

    users.forEach(user => {
        updateUserStatusUI(user);
    });

    // 🔥 ADD THIS
    updateStatusButtons(currentUser);
}
document.addEventListener("DOMContentLoaded", function () {
    updateAllStatuses();
});

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');

    return `${hrs}:${mins}:${secs}`;
}

setInterval(() => {
    updateAllStatuses();
}, 1000);

function updateStatusButtons(user) {
    const currentStatus = computeStatus(user);

    const buttons = document.querySelectorAll('.status-btn');

    buttons.forEach(btn => {
        btn.classList.remove('disabled', 'active');

        const label = btn.querySelector('.btn-text')?.innerText;

        // 🔥 BREAK MODE (lock everything except Back)
        if (currentStatus === "Break") {

            if (label === "Back") {
                btn.classList.add('active'); // optional highlight
            } else {
                btn.classList.add('disabled');
            }

            return;
        }

        // 🔥 NORMAL MODE

        // Disable current status button only
        if (
            (currentStatus === "Away" && label === "Away") ||
            (currentStatus === "Non SQ" && label === "Non SQ")
        ) {
            btn.classList.add('disabled');
            btn.classList.add('active');
        }

    });
}
