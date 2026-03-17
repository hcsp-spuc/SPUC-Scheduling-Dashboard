import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzSCJ8XellJRvOSBZ7cTCA2OcmFh8jSrs",
    authDomain: "spuc-events-web.firebaseapp.com",
    projectId: "spuc-events-web",
    storageBucket: "spuc-events-web.firebasestorage.app",
    messagingSenderId: "989356465487",
    appId: "1:989356465487:web:428b119629a939e725793a",
    measurementId: "G-QE1HPE63EH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentDate = new Date();
let selectedDate = new Date();
let currentEditingEventId = null;

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

function isEventTimePassed(eventDate, eventTime) {
    const eventDateTime = new Date(eventDate);
    const eventMinutes = convertTimeToMinutes(eventTime);
    const eventHours = Math.floor(eventMinutes / 60);
    const eventMins = eventMinutes % 60;
    
    eventDateTime.setHours(eventHours, eventMins, 0, 0);
    
    const now = new Date();
    return now > eventDateTime;
}

function isEventCurrentlyOngoing(eventDate, eventTime) {
    const eventDateTime = new Date(eventDate);
    const eventMinutes = convertTimeToMinutes(eventTime);
    const eventHours = Math.floor(eventMinutes / 60);
    const eventMins = eventMinutes % 60;
    
    eventDateTime.setHours(eventHours, eventMins, 0, 0);
    
    const endDateTime = new Date(eventDateTime);
    endDateTime.setHours(eventDateTime.getHours() + 2);
    
    const now = new Date();
    return now >= eventDateTime && now < endDateTime;
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
    monthNav.appendChild(span1);

    const span2 = document.createElement('span');
    span2.className = 'month-label';
    span2.textContent = months[1].name;
    monthNav.appendChild(span2);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn prev';
    prevBtn.textContent = '<';
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate);
        updateMonthDisplay();
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
    });
    monthNav.appendChild(nextBtn);

    const span4 = document.createElement('span');
    span4.className = 'month-label';
    span4.textContent = months[3].name;
    monthNav.appendChild(span4);

    const span5 = document.createElement('span');
    span5.className = 'month-label';
    span5.textContent = months[4].name;
    monthNav.appendChild(span5);
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
    
    for (let day = 1; day <= daysInMonth; day++) {
        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.textContent = day;
        btn.type = 'button';
        
        const btnDate = new Date(year, month, day);
        if (btnDate.toDateString() === selectedDate.toDateString()) {
            btn.classList.add('selected');
        }
        
        btn.addEventListener('click', () => selectDate(btnDate));
        calendarDates.appendChild(btn);
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

function selectDate(date) {
    selectedDate = new Date(date);
    generateCalendar(currentDate);
    updateFormDate();
    loadTimeSlots();
    loadScheduleForDay();
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
        } else if (e.target.value !== '') {
            customTimeInput.style.display = 'none';
            timeSlotSelect.style.display = 'block';
        }
    });
    
    customTimeInput.addEventListener('blur', () => {
        if (customTimeInput.value.trim() !== '') {
            timeSlotSelect.value = customTimeInput.value;
            customTimeInput.style.display = 'none';
            timeSlotSelect.style.display = 'block';
        } else {
            timeSlotSelect.value = '';
            customTimeInput.style.display = 'none';
            timeSlotSelect.style.display = 'block';
        }
    });
    
    customTimeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            customTimeInput.blur();
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
        } else if (e.target.value !== '') {
            customProgramInput.style.display = 'none';
            programSelect.style.display = 'block';
        }
    });
    
    customProgramInput.addEventListener('blur', () => {
        if (customProgramInput.value.trim() !== '') {
            programSelect.value = customProgramInput.value;
            customProgramInput.style.display = 'none';
            programSelect.style.display = 'block';
        } else {
            programSelect.value = '';
            customProgramInput.style.display = 'none';
            programSelect.style.display = 'block';
        }
    });
    
    customProgramInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            customProgramInput.blur();
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
        } else if (e.target.value !== '') {
            editCustomTimeInput.style.display = 'none';
            editTimeSelect.style.display = 'block';
        }
    });
    
    editCustomTimeInput.addEventListener('blur', () => {
        if (editCustomTimeInput.value.trim() !== '') {
            editTimeSelect.value = editCustomTimeInput.value;
            editCustomTimeInput.style.display = 'none';
            editTimeSelect.style.display = 'block';
        } else {
            editTimeSelect.value = '';
            editCustomTimeInput.style.display = 'none';
            editTimeSelect.style.display = 'block';
        }
    });
    
    editCustomTimeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            editCustomTimeInput.blur();
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
        } else if (e.target.value !== '') {
            editCustomProgramInput.style.display = 'none';
            editProgramSelect.style.display = 'block';
        }
    });
    
    editCustomProgramInput.addEventListener('blur', () => {
        if (editCustomProgramInput.value.trim() !== '') {
            editProgramSelect.value = editCustomProgramInput.value;
            editCustomProgramInput.style.display = 'none';
            editProgramSelect.style.display = 'block';
        } else {
            editProgramSelect.value = '';
            editCustomProgramInput.style.display = 'none';
            editProgramSelect.style.display = 'block';
        }
    });
    
    editCustomProgramInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            editCustomProgramInput.blur();
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
            
            let status = event.status || 'Upcoming';
            
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
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            const eventRef = doc(db, "events", eventId);
            await deleteDoc(eventRef);
            alert('Event deleted successfully!');
            loadScheduleForDay();
        } catch (error) {
            console.error("Error deleting event:", error);
            alert('Error deleting event');
        }
    }
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
            
            document.getElementById('editTime').value = eventData.time;
            document.getElementById('editProgram').value = eventData.programName;
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
        alert('Error: No event selected for editing');
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
        alert('Please fill in all required fields');
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
        
        alert('Event updated successfully!');
        closeEditModal();
        loadScheduleForDay();
    } catch (error) {
        console.error("Error updating event:", error);
        alert('Error updating event: ' + error.message);
    }
});

document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const timeSlotSelect = document.getElementById('timeSlot');
    const customTimeInput = document.getElementById('customTimeInput');
    const timeSlot = timeSlotSelect.style.display === 'none' ? customTimeInput.value : timeSlotSelect.value;
    
    const programSelect = document.getElementById('program');
    const customProgramInput = document.getElementById('customProgramInput');
    const program = programSelect.style.display === 'none' ? customProgramInput.value : programSelect.value;
    
    const description = document.getElementById('description').value;
    
    if (!timeSlot || !program) {
        alert('Please select both time slot and program');
        return;
    }
    
    try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventCount = eventsSnapshot.size + 1;
        const docName = `event${eventCount}`;
        
        await setDoc(doc(db, "events", docName), {
            date: selectedDate.toDateString(),
            time: timeSlot,
            programName: program,
            description: description,
            status: 'Upcoming',
            createdAt: new Date()
        });
        
        alert('Event added successfully!');
        document.getElementById('eventForm').reset();
        timeSlotSelect.style.display = 'block';
        customTimeInput.style.display = 'none';
        programSelect.style.display = 'block';
        customProgramInput.style.display = 'none';
        loadScheduleForDay();
    } catch (error) {
        console.error("Error adding event:", error);
        alert('Error adding event: ' + error.message);
    }
});

generateCalendar(currentDate);
updateMonthDisplay();
updateFormDate();
loadTimeSlots();
loadPrograms();
loadScheduleForDay();
