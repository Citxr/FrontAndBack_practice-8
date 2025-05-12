document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('note-input');
    const addNoteBtn = document.getElementById('add-note-btn');
    const notesList = document.getElementById('notes-list');
    const offlineStatus = document.getElementById('offline-status');
    const notifyBtn = document.getElementById('notify-btn');
    const completedInput = document.getElementById('completed-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentFilter = 'all';
    let notificationPermission = Notification.permission;
    let reminderInterval = null;

    function updateOnlineStatus() {
        if (navigator.onLine) {
            offlineStatus.style.display = 'none';
        } else {
            offlineStatus.style.display = 'block';
        }
    }

    function initNotifications() {
        notifyBtn.textContent = notificationPermission === 'granted'
            ? 'Уведомления включены'
            : 'Включить уведомления';

        notifyBtn.disabled = notificationPermission === 'granted';

        if (notificationPermission === 'granted') {
            startReminder();
        }
    }

    function startReminder() {
        if (reminderInterval) clearInterval(reminderInterval);

        reminderInterval = setInterval(() => {
            const activeNotes = getNotes().filter(note => !note.completed);
            if (activeNotes.length > 0) {
                showNotification(
                    'Напоминание',
                    `У вас ${activeNotes.length} невыполненных заметок!`
                );
            }
        }, 2 * 60 * 60 * 1000);
    }

    function showNotification(title, body) {
        if (notificationPermission !== 'granted') return;

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification(title, { body });
        }
    }

    function getNotes() {
        const notes = JSON.parse(localStorage.getItem('notes')) || [];

        switch(currentFilter) {
            case 'active':
                return notes.filter(note => !note.completed);
            case 'completed':
                return notes.filter(note => note.completed);
            default:
                return notes;
        }
    }

    function loadNotes() {
        notesList.innerHTML = '';
        const notes = getNotes();

        notes.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = `note ${note.completed ? 'completed' : ''}`;
            noteElement.innerHTML = `
                <div class="note-text">${note.text}</div>
                <div class="note-date">${new Date(note.date).toLocaleString()}</div>
                <div class="note-actions">
                    <button class="btn toggle-complete-btn" data-index="${index}">
                        ${note.completed ? 'Активировать' : 'Выполнить'}
                    </button>
                    <button class="btn delete-btn" data-index="${index}">Удалить</button>
                </div>
            `;
            notesList.appendChild(noteElement);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteNote(parseInt(e.target.getAttribute('data-index')));
            });
        });

        document.querySelectorAll('.toggle-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                toggleNoteComplete(parseInt(e.target.getAttribute('data-index')));
            });
        });
    }

    function addNote() {
        const text = noteInput.value.trim();
        if (!text) return;

        const notes = JSON.parse(localStorage.getItem('notes')) || [];
        notes.push({
            text,
            date: new Date().toISOString(),
            completed: completedInput.checked
        });

        localStorage.setItem('notes', JSON.stringify(notes));

        noteInput.value = '';
        completedInput.checked = false;
        loadNotes();

        if (notificationPermission === 'granted') {
            showNotification('Новая заметка', 'Вы добавили новую заметку');
        }
    }

    function deleteNote(index) {
        const notes = JSON.parse(localStorage.getItem('notes')) || [];
        notes.splice(index, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    function toggleNoteComplete(index) {
        const notes = JSON.parse(localStorage.getItem('notes')) || [];
        notes[index].completed = !notes[index].completed;
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    let deferredPrompt;
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('Пользователь принял предложение установки');
        } else {
            console.log('Пользователь отклонил предложение установки');
        }
        deferredPrompt = null;
        installBtn.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA было установлено');
        installBtn.classList.add('hidden');
        deferredPrompt = null;
    });

    window.addEventListener('load', () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            installBtn.classList.add('hidden');
        }
    });


    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.getAttribute('data-filter');
            loadNotes();
        });
    });

    notifyBtn.addEventListener('click', async () => {
        if (notificationPermission !== 'granted') {
            notificationPermission = await Notification.requestPermission();

            if (notificationPermission === 'granted') {
                showNotification('Уведомления', 'Теперь вы будете получать уведомления');
                startReminder();
            }

            initNotifications();
        }
    });

    window.addEventListener('load', () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            installBtn.classList.add('hidden');
        }
    });

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    initNotifications();
    loadNotes();

    addNoteBtn.addEventListener('click', addNote);
    noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNote();
        }
    });
});