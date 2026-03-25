import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showModal, showConfirm, initModal } from "/Script/modal.js";

const firebaseConfig = {
    apiKey: "AIzaSyB32ggdpwiNyZ0BKXeqwhVG7_Ei2qLF-Pw",
    authDomain: "hcsp-scheduling-system.firebaseapp.com",
    projectId: "hcsp-scheduling-system",
    storageBucket: "hcsp-scheduling-system.firebasestorage.app",
    messagingSenderId: "498610158944",
    appId: "1:498610158944:web:d4c6778a849016e12c7205",
    measurementId: "G-GFNQXDK1LE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

initModal();

let currentDate = new Date();
let selectedDate = new Date();
let currentEditingEventId = null;
let eventCountMap = new Map();

const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const dayNames = ["SUN", "MON", "TUES", "WED", "THU", "FRI", "SAT"];

const amSlots = [
    '6:00 - 8:00 AM',
    '8:30 - 9:30 AM',
    '10:00 - 11:30 AM'
];

const pmSlots = [
    '1:00 - 2:30 PM',
    '3:00 - 4:00 PM',
    '4:30 - 5:30 PM',
    '6:00 - 7:30 PM',
    '8:00 - 9:00 PM'
];

function convertTimeToMinutes(timeStr) {
    const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!parts) return 0;
    
    let hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const period = parts[3];
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
}

function getEventStatus(eventDate, eventTime) {
    const eventDateTime = new Date(eventDate);
    const eventMinutes = convertTimeToMinutes(eventTime);
    const eventHours = Math.floor(eventMinutes / 60);
    const eventMins = eventMinutes % 60;
    
    eventDateTime.setHours(eventHours, eventMins, 0, 0);
    
    const endDateTime = new Date(eventDateTime);
    endDateTime.setHours(eventDateTime.getHours() + 2);
    
    const now = new Date();
    
    if (now >= eventDateTime && now < endDateTime) {
        return 'On-going';
    } else if (now > endDateTime) {
        return 'Done';
    } else {
        return 'Upcoming';
    }
}

function updateMonthDisplay() {
    const months = [];
    for (let i = -2; i <= 2; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        const monthName = monthNames[date.getMonth()];
        const year = date.getFullYear();
        months.push({ name: monthName, year: year, offset: i });
    }

    const monthNav = document.querySelector('.month-nav');
    monthNav.innerHTML = '';

    const span1 = document.createElement('span');
    span1.className = 'month-label';
    span1.textContent = months[0].name;
    span1.addEventListener('click', () => navigateToMonth(months[0]));
    monthNav.appendChild(span1);

    const span2 = document.createElement('span');
    span2.className = 'month-label';
    span2.textContent = months[1].name;
    span2.addEventListener('click', () => navigateToMonth(months[1]));
    monthNav.appendChild(span2);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn prev';
    prevBtn.textContent = '<';
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate);
        updateMonthDisplay();
        resetFormInputs();
    });
    monthNav.appendChild(prevBtn);

    const currentSpan = document.createElement('h3');
    currentSpan.className = 'current-month';
    currentSpan.id = 'currentMonth';
    currentSpan.textContent = `${months[2].name} ${months[2].year}`;
    monthNav.appendChild(currentSpan);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn next';
    nextBtn.textContent = '>';
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate);
        updateMonthDisplay();
        resetFormInputs();
    });
    monthNav.appendChild(nextBtn);

    const span4 = document.createElement('span');
    span4.className = 'month-label';
    span4.textContent = months[3].name;
    span4.addEventListener('click', () => navigateToMonth(months[3]));
    monthNav.appendChild(span4);

    const span5 = document.createElement('span');
    span5.className = 'month-label';
    span5.textContent = months[4].name;
    span5.addEventListener('click', () => navigateToMonth(months[4]));
    monthNav.appendChild(span5);
}

function showFieldError(input, errorId) {
    input.classList.add('input-error');
    const err = document.getElementById(errorId);
    if (err) err.style.display = 'block';
}

function clearFieldError(input, errorId) {
    input.classList.remove('input-error');
    const err = document.getElementById(errorId);
    if (err) err.style.display = 'none';
}

function navigateToMonth({ name, year }) {
    const monthIndex = monthNames.indexOf(name);
    currentDate = new Date(year, monthIndex, 1);
    generateCalendar(currentDate);
    updateMonthDisplay();
    resetFormInputs();
}

async function loadEventCounts() {
    const snapshot = await getDocs(collection(db, "events"));
    eventCountMap = new Map();
    snapshot.forEach(d => {
        const { date, status } = d.data();
        if (!date) return;
        const entry = eventCountMap.get(date) || { count: 0, doneCount: 0 };
        entry.count++;
        if (status === 'Done') entry.doneCount++;
        eventCountMap.set(date, entry);
    });
    generateCalendar(currentDate);
}

function generateCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDates = document.getElementById('calendarDates');
    calendarDates.innerHTML = '';
    
    for (let i = firstDay - 1; i >= 0; i--) {
        const btn = document.createElement('button');
        btn.className = 'date-btn other-month';
        btn.textContent = daysInPrevMonth - i;
        btn.disabled = true;
        calendarDates.appendChild(btn);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const btnDate = new Date(year, month, day);
        const entry = eventCountMap.get(btnDate.toDateString());
        const count = entry ? entry.count : 0;
        const allDone = entry && entry.count > 0 && entry.doneCount === entry.count;
        const isPast = btnDate < today;

        const wrapper = document.createElement('div');
        wrapper.className = 'date-cell';

        const btn = document.createElement('button');
        btn.className = 'date-btn';
        if (allDone) btn.classList.add('date-done');
        if (isPast) btn.classList.add('date-past');
        btn.textContent = day;
        btn.type = 'button';

        if (btnDate.toDateString() === selectedDate.toDateString()) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', () => selectDate(btnDate));
        wrapper.appendChild(btn);

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'event-badge';
            badge.textContent = count;
            wrapper.appendChild(badge);
        }

        if (allDone) {
            const check = document.createElement('span');
            check.className = 'done-check';
            check.innerHTML = `<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="1,5 4.5,8.5 11,1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            wrapper.appendChild(check);
        }

        calendarDates.appendChild(wrapper);
    }
    
    const totalCells = calendarDates.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const btn = document.createElement('button');
        btn.className = 'date-btn other-month';
        btn.textContent = day;
        btn.disabled = true;
        calendarDates.appendChild(btn);
    }
}

function resetFormInputs() {
    const timeSlotSelect = document.getElementById('timeSlot');
    const customTimeInput = document.getElementById('customTimeInput');
    const programSelect = document.getElementById('program');
    const customProgramInput = document.getElementById('customProgramInput');

    customTimeInput.value = '';
    customTimeInput.style.display = 'none';
    timeSlotSelect.style.display = 'block';
    timeSlotSelect.value = '';
    clearFieldError(customTimeInput, 'timeError');

    customProgramInput.value = '';
    customProgramInput.style.display = 'none';
    programSelect.style.display = 'block';
    programSelect.value = '';
    clearFieldError(customProgramInput, 'programError');

    document.getElementById('repeatToggle').checked = false;
    document.getElementById('repeatOptions').style.display = 'none';
    document.querySelectorAll('input[name="repeatDay"]').forEach(cb => cb.checked = false);
    document.getElementById('repeatEndDate').value = '';
    document.getElementById('repeatError').style.display = 'none';
}

function selectDate(date) {
    selectedDate = new Date(date);
    generateCalendar(currentDate);
    updateFormDate();
    resetFormInputs();
    loadTimeSlots();
    loadScheduleForDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = selectedDate < today;
    const form = document.getElementById('eventForm');
    const submitBtn = form.querySelector('.btn-submit');

    form.querySelectorAll('select, input').forEach(el => el.disabled = isPast);
    submitBtn.disabled = isPast;
    submitBtn.style.opacity = isPast ? '0.4' : '1';
    submitBtn.style.cursor = isPast ? 'not-allowed' : 'pointer';
}

function updateFormDate() {
    const dayName = dayNames[selectedDate.getDay()];
    const monthName = monthNames[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear();
    
    document.getElementById('selectedDate').textContent = `${dayName} ${monthName} ${day}, ${year}`;
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function setupTimeSlotListeners() {
    const timeSlotSelect = document.getElementById('timeSlot');
    const customTimeInput = document.getElementById('customTimeInput');
    
    timeSlotSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            timeSlotSelect.style.display = 'none';
            customTimeInput.style.display = 'block';
            customTimeInput.value = '';
            customTimeInput.focus();
        }
    });
    
    customTimeInput.addEventListener('input', () => clearFieldError(customTimeInput, 'timeError'));

    customTimeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            customTimeInput.value = '';
            customTimeInput.style.display = 'none';
            timeSlotSelect.style.display = 'block';
            timeSlotSelect.value = '';
            clearFieldError(customTimeInput, 'timeError');
        }
    });
}

async function loadTimeSlots() {
    const timeSlotSelect = document.getElementById('timeSlot');
    timeSlotSelect.innerHTML = '<option value="">Choose time slot</option>';
    
    const amGroup = document.createElement('optgroup');
    amGroup.label = 'AM TIME SLOT';
    amSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        amGroup.appendChild(option);
    });
    timeSlotSelect.appendChild(amGroup);
    
    const pmGroup = document.createElement('optgroup');
    pmGroup.label = 'PM TIME SLOT';
    pmSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        pmGroup.appendChild(option);
    });
    timeSlotSelect.appendChild(pmGroup);

    try {
        const snapshot = await getDocs(collection(db, "timeslots"));
        if (!snapshot.empty) {
            const customGroup = document.createElement('optgroup');
            customGroup.label = 'CUSTOM TIME SLOTS';
            snapshot.forEach(doc => {
                const slot = doc.data().slot;
                if (slot && !amSlots.includes(slot) && !pmSlots.includes(slot)) {
                    const option = document.createElement('option');
                    option.value = slot;
                    option.textContent = slot;
                    customGroup.appendChild(option);
                }
            });
            if (customGroup.children.length > 0) timeSlotSelect.appendChild(customGroup);
        }
    } catch (error) {
        console.error("Error loading custom time slots:", error);
    }
    
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'ADD CUSTOM TIME SLOT';
    timeSlotSelect.appendChild(customOption);
    
    setupTimeSlotListeners();
}

function setupProgramListeners() {
    const programSelect = document.getElementById('program');
    const customProgramInput = document.getElementById('customProgramInput');
    
    programSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            programSelect.style.display = 'none';
            customProgramInput.style.display = 'block';
            customProgramInput.value = '';
            customProgramInput.focus();
        }
    });
    
    customProgramInput.addEventListener('input', () => clearFieldError(customProgramInput, 'programError'));

    customProgramInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            customProgramInput.value = '';
            customProgramInput.style.display = 'none';
            programSelect.style.display = 'block';
            programSelect.value = '';
            clearFieldError(customProgramInput, 'programError');
        }
    });
}

async function loadPrograms() {
    const programSelect = document.getElementById('program');
    programSelect.innerHTML = '<option value="">Choose the program</option>';
    
    try {
        const snapshot = await getDocs(collection(db, "programs"));
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.data().name;
            option.textContent = doc.data().name;
            programSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading programs:", error);
    }
    
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'ADD CUSTOM PROGRAM';
    programSelect.appendChild(customOption);
    
    setupProgramListeners();
}

function setupEditTimeSlotListeners() {
    const editTimeSelect = document.getElementById('editTime');
    const editCustomTimeInput = document.getElementById('editCustomTimeInput');
    
    editTimeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            editTimeSelect.style.display = 'none';
            editCustomTimeInput.style.display = 'block';
            editCustomTimeInput.value = '';
            editCustomTimeInput.focus();
        }
    });
    
    editCustomTimeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            editCustomTimeInput.value = '';
            editCustomTimeInput.style.display = 'none';
            editTimeSelect.style.display = 'block';
            editTimeSelect.value = '';
        }
    });
}

function setupEditProgramListeners() {
    const editProgramSelect = document.getElementById('editProgram');
    const editCustomProgramInput = document.getElementById('editCustomProgramInput');
    
    editProgramSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            editProgramSelect.style.display = 'none';
            editCustomProgramInput.style.display = 'block';
            editCustomProgramInput.value = '';
            editCustomProgramInput.focus();
        }
    });
    
    editCustomProgramInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            editCustomProgramInput.value = '';
            editCustomProgramInput.style.display = 'none';
            editProgramSelect.style.display = 'block';
            editProgramSelect.value = '';
        }
    });
}

function populateEditTimeSlots() {
    const editTimeSelect = document.getElementById('editTime');
    editTimeSelect.innerHTML = '<option value="">Choose time slot</option>';
    
    const amGroup = document.createElement('optgroup');
    amGroup.label = 'AM TIME SLOT';
    amSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        amGroup.appendChild(option);
    });
    editTimeSelect.appendChild(amGroup);
    
    const pmGroup = document.createElement('optgroup');
    pmGroup.label = 'PM TIME SLOT';
    pmSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        pmGroup.appendChild(option);
    });
    editTimeSelect.appendChild(pmGroup);
    
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'ADD CUSTOM TIME SLOT';
    editTimeSelect.appendChild(customOption);
    
    setupEditTimeSlotListeners();
}

async function populateEditPrograms() {
    const editProgramSelect = document.getElementById('editProgram');
    editProgramSelect.innerHTML = '<option value="">Choose the program</option>';
    
    try {
        const snapshot = await getDocs(collection(db, "programs"));
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.data().name;
            option.textContent = doc.data().name;
            editProgramSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading programs:", error);
    }
    
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'ADD CUSTOM PROGRAM';
    editProgramSelect.appendChild(customOption);
    
    setupEditProgramListeners();
}

function getStatusClass(status) {
    switch(status) {
        case 'Done':
            return 'status-done';
        case 'Cancelled':
            return 'status-cancelled';
        case 'Upcoming':
            return 'status-upcoming';
        case 'On-going':
        default:
            return 'status-ongoing';
    }
}

async function loadScheduleForDay() {
    const scheduleList = document.getElementById('scheduleList');
    const scheduleDate = document.getElementById('scheduleDate');
    scheduleList.innerHTML = '';
    
    const dayName = dayNames[selectedDate.getDay()];
    const monthName = monthNames[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear();
    scheduleDate.textContent = `${dayName}, ${monthName} ${day}, ${year}`;
    
    try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const dayEvents = [];
        
        eventsSnapshot.forEach(doc => {
            const eventData = doc.data();
            if (eventData.date === selectedDate.toDateString()) {
                dayEvents.push({
                    id: doc.id,
                    ...eventData
                });
            }
        });
        
        if (dayEvents.length === 0) {
            scheduleList.innerHTML = '<p class="no-schedule">No events scheduled for this day</p>';
            return;
        }
        
        dayEvents.sort((a, b) => convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time));
        
        dayEvents.forEach(event => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            
            let status = getEventStatus(event.date, event.time);
            
            const statusClass = getStatusClass(status);
            
            scheduleItem.innerHTML = `
                <div class="schedule-item-content">
                    <div class="schedule-item-time">${event.time}</div>
                    <div class="schedule-item-program"><strong>Program:</strong> ${event.programName}</div>
                    ${event.description ? `<div class="schedule-item-description"><strong>Description:</strong> ${event.description}</div>` : ''}
                    <div class="schedule-item-status ${statusClass}">${status}</div>
                </div>
                <div class="schedule-item-actions">
                    <button class="schedule-item-btn schedule-item-edit" onclick="editEvent('${event.id}')">EDIT</button>
                    <button class="schedule-item-btn schedule-item-delete" onclick="deleteEvent('${event.id}')">DELETE</button>
                </div>
            `;
            scheduleList.appendChild(scheduleItem);
        });
    } catch (error) {
        console.error("Error loading schedule:", error);
        scheduleList.innerHTML = '<p class="no-schedule">Error loading schedule</p>';
    }
}

window.deleteEvent = async function(eventId) {
    showConfirm('Are you sure you want to delete this event?', async () => {
        try {
            await deleteDoc(doc(db, "events", eventId));
            showModal('Event deleted successfully!');
            await loadEventCounts();
            loadScheduleForDay();
        } catch (error) {
            console.error("Error deleting event:", error);
            showModal('Error deleting event', 'error');
        }
    });
};

window.editEvent = async function(eventId) {
    try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        let eventData = null;
        
        eventsSnapshot.forEach(doc => {
            if (doc.id === eventId) {
                eventData = doc.data();
            }
        });
        
        if (eventData) {
            currentEditingEventId = eventId;
            
            await populateEditTimeSlots();
            await populateEditPrograms();
            
            const editTimeSelect = document.getElementById('editTime');
            const editProgramSelect = document.getElementById('editProgram');
            
            const timeExists = Array.from(editTimeSelect.options).some(opt => opt.value === eventData.time);
            if (timeExists) {
                editTimeSelect.value = eventData.time;
            } else {
                const customTimeOption = document.createElement('option');
                customTimeOption.value = eventData.time;
                customTimeOption.textContent = eventData.time;
                editTimeSelect.insertBefore(customTimeOption, editTimeSelect.lastElementChild);
                editTimeSelect.value = eventData.time;
            }
            
            const programExists = Array.from(editProgramSelect.options).some(opt => opt.value === eventData.programName);
            if (programExists) {
                editProgramSelect.value = eventData.programName;
            } else {
                const customProgramOption = document.createElement('option');
                customProgramOption.value = eventData.programName;
                customProgramOption.textContent = eventData.programName;
                editProgramSelect.insertBefore(customProgramOption, editProgramSelect.lastElementChild);
                editProgramSelect.value = eventData.programName;
            }
            
            document.getElementById('editDescription').value = eventData.description || '';
            document.getElementById('editStatus').value = eventData.status || 'Upcoming';
            
            document.getElementById('editModal').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading event for edit:", error);
        alert('Error loading event');
    }
};

window.closeEditModal = function() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editTime').style.display = 'block';
    document.getElementById('editCustomTimeInput').style.display = 'none';
    document.getElementById('editProgram').style.display = 'block';
    document.getElementById('editCustomProgramInput').style.display = 'none';
    currentEditingEventId = null;
};

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
};

document.getElementById('editEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentEditingEventId) {
        showModal('Error: No event selected for editing', 'error');
        return;
    }
    
    const editTimeSelect = document.getElementById('editTime');
    const editCustomTimeInput = document.getElementById('editCustomTimeInput');
    const editTime = editTimeSelect.style.display === 'none' ? editCustomTimeInput.value : editTimeSelect.value;
    
    const editProgramSelect = document.getElementById('editProgram');
    const editCustomProgramInput = document.getElementById('editCustomProgramInput');
    const editProgram = editProgramSelect.style.display === 'none' ? editCustomProgramInput.value : editProgramSelect.value;
    
    const editDescription = document.getElementById('editDescription').value;
    const editStatus = document.getElementById('editStatus').value;
    
    if (!editTime || !editProgram) {
        showModal('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const eventRef = doc(db, "events", currentEditingEventId);
        await updateDoc(eventRef, {
            time: editTime,
            programName: editProgram,
            description: editDescription,
            status: editStatus
        });
        
        showModal('Event updated successfully!');
        closeEditModal();
        await loadEventCounts();
        loadScheduleForDay();
    } catch (error) {
        console.error("Error updating event:", error);
        showModal('Error updating event: ' + error.message, 'error');
    }
});

// Repeat toggle
document.getElementById('repeatToggle').addEventListener('change', (e) => {
    document.getElementById('repeatOptions').style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
        document.querySelectorAll('input[name="repeatDay"]').forEach(cb => cb.checked = false);
        document.getElementById('repeatEndDate').value = '';
        document.getElementById('repeatError').style.display = 'none';
    }
});

function getRepeatDates(startDate, repeatDays, endDate) {
    const dates = [];
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const cursor = new Date(startDate);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= end) {
        if (repeatDays.includes(cursor.getDay())) {
            dates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const timeSlotSelect = document.getElementById('timeSlot');
    const customTimeInput = document.getElementById('customTimeInput');
    const timeSlot = timeSlotSelect.style.display === 'none' ? customTimeInput.value.trim() : timeSlotSelect.value;
    
    const programSelect = document.getElementById('program');
    const customProgramInput = document.getElementById('customProgramInput');
    const program = programSelect.style.display === 'none' ? customProgramInput.value.trim() : programSelect.value;
    
    const description = document.getElementById('description').value;

    let hasError = false;
    if (timeSlotSelect.style.display === 'none' && !timeSlot) {
        showFieldError(customTimeInput, 'timeError');
        hasError = true;
    }
    if (programSelect.style.display === 'none' && !program) {
        showFieldError(customProgramInput, 'programError');
        hasError = true;
    }
    if (!timeSlot || !program) {
        if (!hasError) showModal('Please select both time slot and program', 'error');
        return;
    }

    const isRepeating = document.getElementById('repeatToggle').checked;
    const repeatDays = isRepeating
        ? [...document.querySelectorAll('input[name="repeatDay"]:checked')].map(cb => parseInt(cb.value))
        : [];
    const repeatEndDate = document.getElementById('repeatEndDate').value;
    const repeatError = document.getElementById('repeatError');

    if (isRepeating && (repeatDays.length === 0 || !repeatEndDate)) {
        repeatError.style.display = 'block';
        return;
    }
    repeatError.style.display = 'none';

    if (isRepeating && new Date(repeatEndDate) <= selectedDate) {
        showModal('Repeat end date must be after the selected date.', 'error');
        return;
    }
    
    try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        let maxNum = eventsSnapshot.docs.reduce((max, d) => {
            const match = d.id.match(/^event(\d+)$/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);

        const baseEventData = {
            time: timeSlot,
            programName: program,
            description: description,
            status: 'Upcoming',
            createdAt: new Date()
        };

        // Save the primary event
        await setDoc(doc(db, "events", `event${++maxNum}`), {
            ...baseEventData,
            date: selectedDate.toDateString()
        });

        // Save repeated events
        if (isRepeating) {
            const repeatDates = getRepeatDates(selectedDate, repeatDays, repeatEndDate);
            for (const d of repeatDates) {
                await setDoc(doc(db, "events", `event${++maxNum}`), {
                    ...baseEventData,
                    date: d.toDateString()
                });
            }
        }

        // Save custom time slot to Firestore if it was a custom entry
        if (timeSlotSelect.style.display === 'none' && timeSlot) {
            const existingSlots = await getDocs(collection(db, "timeslots"));
            const alreadyExists = [...existingSlots.docs].some(d => d.data().slot === timeSlot);
            if (!alreadyExists) await addDoc(collection(db, "timeslots"), { slot: timeSlot });
        }

        showModal('Event added successfully!');
        document.getElementById('eventForm').reset();
        document.getElementById('repeatToggle').checked = false;
        document.getElementById('repeatOptions').style.display = 'none';
        timeSlotSelect.style.display = 'block';
        customTimeInput.style.display = 'none';
        programSelect.style.display = 'block';
        customProgramInput.style.display = 'none';
        loadTimeSlots();
        loadPrograms();
        await loadEventCounts();
        loadScheduleForDay();
    } catch (error) {
        console.error("Error adding event:", error);
        showModal('Error adding event: ' + error.message, 'error');
    }
});

loadEventCounts();
updateMonthDisplay();
updateFormDate();
loadTimeSlots();
loadPrograms();
loadScheduleForDay();
