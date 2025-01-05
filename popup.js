document.addEventListener('DOMContentLoaded', function() {
  loadEvents();
  
  document.getElementById('add-event').addEventListener('click', addNewEvent);
  
  // Update countdowns every second
  setInterval(updateAllCountdowns, 1000);
});

function addNewEvent() {
  const name = document.getElementById('event-name').value;
  const datetime = document.getElementById('event-date').value;
  
  if (!name || !datetime) {
    alert('Please fill in both fields');
    return;
  }
  
  const event = {
    id: Date.now().toString(), // Add unique ID for each event
    name: name,
    datetime: new Date(datetime).toISOString()
  };
  
  chrome.storage.local.get(['events'], function(result) {
    const events = result.events || [];
    events.push(event);
    chrome.storage.local.set({ events: events }, function() {
      loadEvents();
      document.getElementById('event-name').value = '';
      document.getElementById('event-date').value = '';
    });
  });
}

function loadEvents() {
  chrome.storage.local.get(['events'], function(result) {
    const events = result.events || [];
    displayEvents(events);
  });
}

function displayEvents(events) {
  const upcomingContainer = document.getElementById('upcoming-events');
  const pastContainer = document.getElementById('past-events');
  
  upcomingContainer.innerHTML = '';
  pastContainer.innerHTML = '';
  
  events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  events.forEach(event => {
    const eventElement = createEventElement(event);
    const isPast = new Date(event.datetime) < new Date();
    
    if (isPast) {
      pastContainer.appendChild(eventElement);
    } else {
      upcomingContainer.appendChild(eventElement);
    }
  });
}

function createEventElement(event) {
  const div = document.createElement('div');
  div.className = 'event-item';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'event-content';
  
  const nameSpan = document.createElement('span');
  nameSpan.textContent = event.name;
  
  const countdownSpan = document.createElement('span');
  countdownSpan.className = 'countdown';
  countdownSpan.dataset.datetime = event.datetime;
  
  updateCountdown(countdownSpan);
  
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'action-buttons';
  
  const editButton = document.createElement('button');
  editButton.textContent = '✏️ Edit';
  editButton.className = 'edit-btn';
  editButton.onclick = () => editEvent(event, div);
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '🗑️ Delete';
  deleteButton.className = 'delete-btn';
  deleteButton.onclick = () => removeEvent(event);
  
  contentDiv.appendChild(nameSpan);
  contentDiv.appendChild(countdownSpan);
  
  buttonsDiv.appendChild(editButton);
  buttonsDiv.appendChild(deleteButton);
  
  div.appendChild(contentDiv);
  div.appendChild(buttonsDiv);
  
  return div;
}
function editEvent(event, eventElement) {
  // Remove existing edit form if any
  const existingForm = document.querySelector('.edit-form');
  if (existingForm) {
    existingForm.remove();
  }
  
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = event.name;
  nameInput.placeholder = 'Event Name';
  
  const dateInput = document.createElement('input');
  dateInput.type = 'datetime-local';
  
  // Ensure the datetime is formatted correctly (YYYY-MM-DDTHH:MM)
  const eventDatetime = new Date(event.datetime);
  
  // Adjust for local time zone
  const localDatetime = new Date(eventDatetime.getTime() - eventDatetime.getTimezoneOffset() * 60000);
  
  // Format it to YYYY-MM-DDTHH:MM
  const formattedDate = localDatetime.toISOString().slice(0, 16); // Remove seconds and milliseconds
  
  dateInput.value = formattedDate;

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'edit-form-buttons';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'edit-btn';
  saveButton.onclick = () => {
    updateEvent(event.id, nameInput.value, dateInput.value);
    editForm.remove();
  };
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'delete-btn';
  cancelButton.onclick = () => editForm.remove();
  
  buttonsDiv.appendChild(saveButton);
  buttonsDiv.appendChild(cancelButton);
  
  editForm.appendChild(nameInput);
  editForm.appendChild(dateInput);
  editForm.appendChild(buttonsDiv);
  
  eventElement.insertAdjacentElement('afterend', editForm);
}
function updateEvent(eventId, newName, newDatetime) {
  chrome.storage.local.get(['events'], function(result) {
    const events = result.events || [];
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        // Convert newDatetime from local to ISO format to avoid timezone discrepancies
        const newDatetimeISO = new Date(newDatetime).toISOString();
        
        // If no change, return the event as is
        if (event.name === newName && event.datetime === newDatetimeISO) {
          return event;
        }
        
        return {
          ...event,
          name: newName,
          datetime: newDatetimeISO
        };
      }
      return event;
    });
    
    
    chrome.storage.local.set({ events: updatedEvents }, loadEvents);
  });
}

function updateAllCountdowns() {
  document.querySelectorAll('.countdown').forEach(updateCountdown);
}

function updateCountdown(element) {
  const eventDate = new Date(element.dataset.datetime);
  const now = new Date();
  let diff = eventDate - now;
  
  const isPast = diff < 0;
  if (isPast) {
    diff = Math.abs(diff);
    element.classList.add('past');
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  let displayText = '';
  if (days > 1) {
    displayText = `${days} days`;
    if (!isPast) {
      const date = eventDate.getDate();
      const month = eventDate.toLocaleString('default', { month: 'long' });
      displayText += ` (${date} ${month})`;
    }
  } else if (days === 1) {
    displayText = `${days} day, ${hours} hours`;
  } else if (hours > 1) {
    displayText = `${hours} hours`;
  } else if (hours === 1) {
    displayText = `${hours} hour, ${minutes} minutes`;
  } else if (minutes > 1) {
    displayText = `${minutes} minutes`;
  } else {
    displayText = `${seconds} seconds`;
  }
  
  if (isPast) {
    displayText += ' ago';
  }
  
  element.textContent = displayText;
}

function removeEvent(eventToRemove) {
  if (confirm('Are you sure you want to delete this event?')) {
    chrome.storage.local.get(['events'], function(result) {
      const events = result.events || [];
      const updatedEvents = events.filter(event => event.id !== eventToRemove.id);
      chrome.storage.local.set({ events: updatedEvents }, loadEvents);
    });
  }
}