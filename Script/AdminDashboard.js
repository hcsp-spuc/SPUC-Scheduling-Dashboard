import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const dayNames = ["SUN", "MON", "TUES", "WED", "THU", "FRI", "SAT"];

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

    // First month (2 months before)
    const span1 = document.createElement('span');
    span1.className = 'month-label';
    span1.textContent = months[0].name;
    monthNav.appendChild(span1);

    // Second month (1 month before)
    const span2 = document.createElement('span');
    span2.className = 'month-label';
    span2.textContent = months[1].name;
    monthNav.appendChild(span2);

    // Previous button
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

    // Current month
    const currentSpan = document.createElement('h3');
    currentSpan.className = 'current-month';
    currentSpan.id = 'currentMonth';
    currentSpan.textContent = `${months[2].name} ${months[2].year}`;
    monthNav.appendChild(currentSpan);

    // Next button
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

    // Fourth month (1 month after)
    const span4 = document.createElement('span');
    span4.className = 'month-label';
    span4.textContent = months[3].name;
    monthNav.appendChild(span4);

    // Fifth month (2 months after)
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
    
    // Add AM slots
    const amGroup = document.createElement('optgroup');
    amGroup.label = 'AM TIME SLOT';
    amSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        amGroup.appendChild(option);
    });
    timeSlotSelect.appendChild(amGroup);
    
    // Add PM slots
    const pmGroup = document.createElement('optgroup');
    pmGroup.label = 'PM TIME SLOT';
    pmSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        pmGroup.appendChild(option);
    });
    timeSlotSelect.appendChild(pmGroup);
    
    // Add custom time slot option
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
    
    // Add custom program option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'ADD CUSTOM PROGRAM';
    programSelect.appendChild(customOption);
    
    setupProgramListeners();
}

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
        // Get the current count of events
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventCount = eventsSnapshot.size + 1;
        const docName = `event${eventCount}`;
        
        // Save with custom document name
        await setDoc(doc(db, "events", docName), {
            date: selectedDate.toDateString(),
            time: timeSlot,
            programName: program,
            description: description,
            createdAt: new Date()
        });
        
        alert('Event added successfully!');
        document.getElementById('eventForm').reset();
        timeSlotSelect.style.display = 'block';
        customTimeInput.style.display = 'none';
        programSelect.style.display = 'block';
        customProgramInput.style.display = 'none';
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
