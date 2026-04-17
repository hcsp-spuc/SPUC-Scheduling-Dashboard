export function showModal(message, type = 'success') {
    document.getElementById('modalTitle').textContent = type === 'error' ? 'ERROR' : 'SUCCESS';
    document.getElementById('modalHeader').className = `modal-header ${type}`;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalOverlay').classList.add('active');
}

export function showConfirm(message, onConfirm) {
    document.getElementById('modalTitle').textContent = 'CONFIRM';
    document.getElementById('modalHeader').className = 'modal-header confirm';
    document.getElementById('modalMessage').textContent = message;

    const overlay = document.getElementById('modalOverlay');
    const okBtn = document.getElementById('modalOkBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    cancelBtn.style.display = 'inline-block';
    overlay.classList.add('active');

    const handleOk = () => {
        overlay.classList.remove('active');
        cancelBtn.style.display = 'none';
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        onConfirm();
    };

    const handleCancel = () => {
        overlay.classList.remove('active');
        cancelBtn.style.display = 'none';
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}

export function showDeleteChoice(onDeleteOne, onDeleteAll) {
    document.getElementById('modalTitle').textContent = 'DELETE RECURRING EVENT';
    document.getElementById('modalHeader').className = 'modal-header confirm';
    document.getElementById('modalMessage').textContent = 'This is a recurring event. What would you like to delete?';

    const overlay = document.getElementById('modalOverlay');
    const footer = document.querySelector('.modal-footer');

    footer.innerHTML = `
        <button class="modal-btn-cancel" id="deleteChoiceCancel">CANCEL</button>
        <button class="modal-btn modal-btn-secondary" id="deleteChoiceOne">THIS EVENT ONLY</button>
        <button class="modal-btn" id="deleteChoiceAll">ALL RECURRING</button>
    `;

    overlay.classList.add('active');

    const cleanup = () => {
        overlay.classList.remove('active');
        footer.innerHTML = `
            <button class="modal-btn-cancel" id="modalCancelBtn" style="display:none;">CANCEL</button>
            <button class="modal-btn" id="modalOkBtn">OK</button>
        `;
        initModal();
    };

    document.getElementById('deleteChoiceOne').addEventListener('click', () => { cleanup(); onDeleteOne(); });
    document.getElementById('deleteChoiceAll').addEventListener('click', () => { cleanup(); onDeleteAll(); });
    document.getElementById('deleteChoiceCancel').addEventListener('click', cleanup);
}

export function initModal() {
    document.getElementById('modalOkBtn').addEventListener('click', () => {
        document.getElementById('modalOverlay').classList.remove('active');
        document.getElementById('modalCancelBtn').style.display = 'none';
    });
}
