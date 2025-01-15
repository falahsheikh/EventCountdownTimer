document.addEventListener('DOMContentLoaded', function() {
  loadEvents();
  
  document.getElementById('add-event').addEventListener('click', addNewEvent);
  
  document.getElementById('search-events').addEventListener('input', function(e) {
    searchEvents(e.target.value);
  });
  
  setInterval(updateAllCountdowns, 1000);
});

function searchEvents(searchTerm) {
  chrome.storage.sync.get(['events'], function(result) {
    const events = result.events || [];
    const filteredEvents = events.filter(event => {
      const searchString = searchTerm.toLowerCase();
      return event.name.toLowerCase().includes(searchString) || 
             (event.notes && event.notes.toLowerCase().includes(searchString));
    });
    displayEvents(filteredEvents);
  });
}

function truncateText(text, maxLength = 15) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
function addNewEvent() {
  const name = document.getElementById('event-name').value;
  const datetime = document.getElementById('event-date').value;
  const notes = document.getElementById('event-notes').value;
  
  if (!name || !datetime) {
    alert('Please fill in both name and date fields');
    return;
  }
  
  const event = {
    id: Date.now().toString(),
    name: truncateText(name), // Truncate the name before saving
    fullName: name, // Store the full name for editing/details
    datetime: new Date(datetime).toISOString(),
    notes: notes || ''
  };
  
  chrome.storage.sync.get(['events'], function(result) {
    const events = result.events || [];
    events.push(event);
    chrome.storage.sync.set({ events: events }, function() {
      loadEvents();
      document.getElementById('event-name').value = '';
      document.getElementById('event-date').value = '';
      document.getElementById('event-notes').value = '';
    });
  });
}

function createTimeDifferenceElement(currentEvent, nextEvent) {
  const div = document.createElement('div');
  div.className = 'time-difference';
  div.style.padding = '8px';
  div.style.marginLeft = '20px';
  div.style.color = '#666';
  div.style.fontSize = '0.9em';
  div.style.fontStyle = 'italic';
  
  const currentDate = new Date(currentEvent.datetime);
  const nextDate = new Date(nextEvent.datetime);
  const diffMs = Math.abs(nextDate - currentDate);
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let diffText = '➔ Time until next event: ';
  if (days > 0) {
    diffText += `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) diffText += ` and ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    diffText += `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    diffText += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  div.textContent = diffText;
  return div;
}

function createEventElement(event) {
  const div = document.createElement('div');
  div.className = 'event-item';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'event-content';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'event-name';
  nameSpan.textContent = event.name;
  
  // Create tooltip only if the name is truncated
  if (event.fullName && event.fullName !== event.name) {
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    const tooltipContent = document.createElement('span');
    tooltipContent.className = 'tooltip-content';
    tooltipContent.textContent = event.fullName;
    tooltip.appendChild(tooltipContent);
    nameSpan.appendChild(tooltip);    
  }
  
  const countdownSpan = document.createElement('span');
  countdownSpan.className = 'countdown';
  countdownSpan.dataset.datetime = event.datetime;
  
  updateCountdown(countdownSpan);
  
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'action-buttons';
  
  const notesButton = document.createElement('button');
  notesButton.textContent = 'Notes';
  notesButton.className = 'notes-btn';
  notesButton.onclick = () => toggleNotes(event, div);
  
  const editButton = document.createElement('button');
  editButton.textContent = 'Edit';
  editButton.className = 'edit-btn';
  editButton.onclick = () => editEvent(event, div);
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.className = 'delete-btn';
  deleteButton.onclick = () => removeEvent(event);
  
  contentDiv.appendChild(nameSpan);
  contentDiv.appendChild(countdownSpan);
  
  buttonsDiv.appendChild(notesButton);
  buttonsDiv.appendChild(editButton);
  buttonsDiv.appendChild(deleteButton);
  
  div.appendChild(contentDiv);
  div.appendChild(buttonsDiv);
  
  return div;
}

function toggleNotes(event, eventElement) {
  const existingNotes = document.querySelector('.notes-form');
  if (existingNotes) {
    existingNotes.remove();
  }
  
  if (existingNotes && existingNotes.dataset.eventId === event.id) {
    return;
  }
  
  const notesForm = document.createElement('div');
  notesForm.className = 'notes-form edit-form';
  notesForm.dataset.eventId = event.id;
  
  const notesInput = document.createElement('textarea');
  notesInput.className = 'form-control';
  notesInput.value = event.notes || '';
  notesInput.placeholder = 'Add your notes here...';
  
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'edit-form-buttons';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'edit-btn';
  saveButton.onclick = () => {
    updateEventNotes(event.id, notesInput.value);
    notesForm.remove();
  };
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'delete-btn';
  cancelButton.onclick = () => notesForm.remove();
  
  buttonsDiv.appendChild(saveButton);
  buttonsDiv.appendChild(cancelButton);
  
  notesForm.appendChild(notesInput);
  notesForm.appendChild(buttonsDiv);
  
  eventElement.insertAdjacentElement('afterend', notesForm);
}

function updateEventNotes(eventId, newNotes) {
  chrome.storage.sync.get(['events'], function(result) {
    const events = result.events || [];
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          notes: newNotes
        };
      }
      return event;
    });
    
    chrome.storage.sync.set({ events: updatedEvents }, loadEvents);
  });
}

function editEvent(event, eventElement) {
  const existingForm = document.querySelector('.edit-form');
  if (existingForm) {
    existingForm.remove();
  }
  
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = event.fullName || event.name; // Use full name for editing
  nameInput.placeholder = 'Event Name';
  
  const dateInput = document.createElement('input');
  dateInput.type = 'datetime-local';
  
  const eventDatetime = new Date(event.datetime);
  const localDatetime = new Date(eventDatetime.getTime() - eventDatetime.getTimezoneOffset() * 60000);
  const formattedDate = localDatetime.toISOString().slice(0, 16);
  
  dateInput.value = formattedDate;
  
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'edit-form-buttons';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'edit-btn';
  saveButton.onclick = () => {
    updateEvent(event.id, nameInput.value, dateInput.value, event.notes);
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

function updateEvent(eventId, newName, newDatetime, notes) {
  chrome.storage.sync.get(['events'], function(result) {
    const events = result.events || [];
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        const newDatetimeISO = new Date(newDatetime).toISOString();
        return {
          ...event,
          name: truncateText(newName), // Truncate the displayed name
          fullName: newName, // Store the full name
          datetime: newDatetimeISO,
          notes: notes
        };
      }
      return event;
    });
    
    chrome.storage.sync.set({ events: updatedEvents }, loadEvents);
  });
}

function loadEvents() {
  chrome.storage.sync.get(['events'], function(result) {
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
  
  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.datetime) >= now);
  const pastEvents = events.filter(event => new Date(event.datetime) < now);
  
  // Display upcoming events with time differences
  upcomingEvents.forEach((event, index) => {
    const eventElement = createEventElement(event);
    upcomingContainer.appendChild(eventElement);
    
    if (index < upcomingEvents.length - 1) {
      const timeDiffElement = createTimeDifferenceElement(event, upcomingEvents[index + 1]);
      upcomingContainer.appendChild(timeDiffElement);
    }
  });
  
  // Display past events
  pastEvents.forEach(event => {
    const eventElement = createEventElement(event);
    pastContainer.appendChild(eventElement);
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
    chrome.storage.sync.get(['events'], function(result) {
      const events = result.events || [];
      const updatedEvents = events.filter(event => event.id !== eventToRemove.id);
      chrome.storage.sync.set({ events: updatedEvents }, loadEvents);
    });
  }
}