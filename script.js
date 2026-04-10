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

    if (column.classList.contains('not-task')) {
        pendingMove = {
            column: column,
            y: e.clientY
        };

        document.getElementById('confirmModal').classList.remove('hidden');
        return false;
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

        if (name !== currentName) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dropdown.appendChild(option);
        }
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

function selectCodeTable(type, el) {

    // update active state
    document.querySelectorAll('.code-menu-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');

    // update title
    document.getElementById('codeTitle').innerText = el.innerText;

    // placeholder for now
    document.getElementById('codeContent').innerHTML = `
        <p>Showing ${type} table...</p>
    `;
}

function handleAddClick() {

    if (currentTable === "users") {
        openAddUserModal();
    }

    if (currentTable === "managers") {
        openAddManagerModal();
    }

    if (currentTable === "tasks") {
        openAddTaskModal();
    }
}