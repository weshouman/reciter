let typedInstance = null;
let TYPE_SPEED = 80; // Inversed
let TYPE_SPEED_ERROR = 20;
let single_line = false;
let typingTimeout;
let isPaused = false;
let typingWasRunning = false; // Track if typing was running before an undo
let currentText = "";
let currentError = false;
let currentPos = 0;
let historyStack = [];  // To track each addition for undo
let pausing = false;
const LINE_START_TOLERANCE = 5;
const atomic_lines_mode = true;
const maxSpeed = 5;  // Set max speed for finishing the line (instant is 1)

function pauseTyping() {
    if (atomic_lines_mode && !isPaused) {
        // Complete the current line at max speed, then pause
        pausing = true;
        finishLineThenPause();
        pausing = false
    } else {
        clearTimeout(typingTimeout);
        isPaused = true;
    }
}

function finishLineThenPause() {
    let currentChar = currentText[currentPos];
    while (currentChar !== '\n' && currentPos < currentText.length) {
        typeCharacter();
        currentChar = currentText[currentPos];
    }
    // Ensure the last line break is typed out before pausing
    if (currentChar === '\n') {
        typeCharacter();
    }
    clearTimeout(typingTimeout);
    isPaused = true;
    const toggleButton = document.getElementById('toggle-typing');
    toggleButton.textContent = 'Resume';
}

function resumeTyping() {
    if (isPaused) {
        isPaused = false;
        typeCharacter();
    }
}

function toggleTyping() {
    const toggleButton = document.getElementById('toggle-typing');
    if (isPaused) {
        resumeTyping();
        toggleButton.textContent = 'Pause';
    } else {
        pauseTyping();
        toggleButton.textContent = 'Resume';
    }
}

function scrollToBottom() {
    const outputDiv = document.getElementById('typed-output');
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Main typing function
function startTyping(text, isError = false) {
    currentText = text;
    currentError = isError;
    currentPos = 0;
    const outputDiv = document.getElementById('typed-output');
    outputDiv.innerHTML = ""; // Clear previous content
    historyStack = [];
    typeCharacter();
}

function typeCharacter() {
    const outputDiv = document.getElementById('typed-output');
    if (isPaused || currentPos >= currentText.length) {
        return;
    }

    let charToAdd = currentText[currentPos];
    if (charToAdd === '\n') {
        outputDiv.innerHTML += '<br>';
        historyStack.push('<br>');
    } else {
        outputDiv.innerHTML += charToAdd;
        historyStack.push(charToAdd);
    }

    currentPos++;
    let delay = pausing ? maxSpeed : (currentError ? TYPE_SPEED_ERROR : TYPE_SPEED);
    typingTimeout = setTimeout(typeCharacter, delay);
    scrollToBottom();
}

function undoTyping(n) {
    const outputDiv = document.getElementById('typed-output');
    typingWasRunning = !isPaused; // Save the current state before pausing
    pauseTyping(); // Pause typing during undo

    // Remove last n elements from the output and historyStack
    currentPos -= n;
    if (currentPos < 0) currentPos = 0;

    // Remove last n elements from the output and historyStack
    for (let i = 0; i < n; i++) {
        if (historyStack.length > 0) {
            historyStack.pop();
        }
    }

    outputDiv.innerHTML = historyStack.join('');

    if (typingWasRunning) {
        resumeTyping(); // Resume typing only if it was running before undo
    }
}


function undoLastLine(tolerance=0) {
    const outputDiv = document.getElementById('typed-output');
    typingWasRunning = !isPaused;
    pauseTyping();

    if (historyStack.length === 0) {
        if (typingWasRunning) {
            resumeTyping();
        }
        return;
    }

    let lastLineBreakIndex = historyStack.lastIndexOf('<br>');
    let currentLineLength = historyStack.length - lastLineBreakIndex - 1;

    if (currentLineLength <= tolerance) {
        // If the current line length is within the tolerance, undo to the start of the previous line
        historyStack.splice(lastLineBreakIndex + 1); // Remove the current line entirely
        if (lastLineBreakIndex !== -1) {
            historyStack.pop(); // Remove the line break itself
            lastLineBreakIndex = historyStack.lastIndexOf('<br>');
            historyStack.splice(lastLineBreakIndex + 1);
        }
    } else {
        // If more characters than tolerance, just clear to the beginning of the current line
        historyStack.splice(lastLineBreakIndex + 1);
    }

    outputDiv.innerHTML = historyStack.join('');
    currentPos = historyStack.length;

    if (typingWasRunning) {
        resumeTyping();
    }
}

function fetchAndStartTyping(filename, sourceName) {
    // Check if sourceName or filename is undefined
    if (!sourceName || !filename) {
        startTyping('Source name or filename is undefined.', true);
        return;  // Stop the function if critical information is missing
    }

    const url = `/list-files/${sourceName}/${filename}`;
    fetch(url)
        .then(response => response.text())
        .then(data => {
            sessionStorage.setItem('lastSelectedFile', filename); // Store in session
            startTyping(data);
        })
        .catch(error => {
            console.error('Error loading the file:', error);
            startTyping('Error loading the text file.', true);
        });
}


document.addEventListener('DOMContentLoaded', function() {
    const alignmentOptions = document.querySelectorAll('input[name="alignment"]');
    const outputDiv = document.getElementById('typed-output');

    function applyAlignment(value) {
        outputDiv.classList.remove('left', 'center', 'right');
        outputDiv.classList.add(value);
        localStorage.setItem('textAlignment', value);
    }

    alignmentOptions.forEach(radio => {
        radio.addEventListener('change', function() {
            applyAlignment(this.value);
        });
    });

    document.getElementById('typing-speed-slider').addEventListener('input', function() {
        TYPE_SPEED = parseInt(this.value, 10);
        document.getElementById('speed-display').textContent = TYPE_SPEED;
    });

    // Check if there's a saved alignment in localStorage or set default
    const savedAlignment = localStorage.getItem('textAlignment') || 'center';
    outputDiv.classList.add(savedAlignment);
    document.querySelector(`input[value="${savedAlignment}"]`).checked = true;

    const sourceSelector = document.getElementById('source-selector');
    sourceSelector.addEventListener('change', function() {
        sessionStorage.setItem('lastSelectedSource', this.value);
        loadFilenames(this.value);
    });

    function loadSources() {
        fetch('/sources')
          .then(response => response.json())
          .then(sources => {
            sources.forEach(source => {
              const option = document.createElement('option');
              option.value = source;
              option.textContent = source;
              sourceSelector.appendChild(option);
            });

            // Restore last selected source
            const lastSelectedSource = sessionStorage.getItem('lastSelectedSource');
            if (lastSelectedSource && sources.includes(lastSelectedSource)) {
                sourceSelector.value = lastSelectedSource;
                loadFilenames(lastSelectedSource);
            } else {
                sourceSelector.value = sources[0]; // Default to the first source if none is found
                loadFilenames(sources[0]);
            }
        });
    }

    const fileSelector = document.getElementById('file-selector');
    fileSelector.addEventListener('change', function() {
        const selectedFile = this.value;
        const selectedSource = sourceSelector.value;
        fetchAndStartTyping(selectedFile, selectedSource);
    });

    function loadFilenames(sourceName) {
        Promise.all([
            fetch(`/list-files/${sourceName}`),
            fetch(`/filename-mapping/${sourceName}`)
        ]).then(([filesResponse, mappingResponse]) => {
            return Promise.all([filesResponse.json(), mappingResponse.json()]);
        }).then(([files, mapping]) => {
            fileSelector.innerHTML = '';  // Clear previous file listings

            if (files.length === 0) {
                outputDiv.innerHTML = '<span style="color: red;">No text files found.</span>';
                return;
            }
            files.forEach(file => {
                const displayName = mapping[file] || file;  // Use mapping if available, otherwise use filename
                const option = document.createElement('option');
                option.value = file;
                option.textContent = displayName;
                fileSelector.appendChild(option);
            });
            const lastSelectedFile = sessionStorage.getItem('lastSelectedFile');
            if (lastSelectedFile && files.includes(lastSelectedFile)) {
                fileSelector.value = lastSelectedFile;
                fetchAndStartTyping(lastSelectedFile, sourceName);
            } else {
                fileSelector.value = files[0];
                fetchAndStartTyping(files[0], sourceName);
            }
        }).catch(error => {
            console.error('Error loading file list or mapping:', error);
            outputDiv.innerHTML = '<span style="color: red;">Error retrieving file list or mapping.</span>';
        });
    }

    // Reload files when restarting typing
    document.getElementById('restart-typing').addEventListener('click', function() {
        restartTyping()
    });

    function restartTyping() {
        const lastSelectedSource = sessionStorage.getItem('lastSelectedSource') || sourceSelector.value;
        const lastSelectedFile = sessionStorage.getItem('lastSelectedFile') || fileSelector.value;
        if (lastSelectedFile && lastSelectedSource) {
            fetchAndStartTyping(lastSelectedFile, lastSelectedSource);
        }
    }

    document.getElementById('toggle-typing').addEventListener('click', toggleTyping);

    document.getElementById('undo-typing').addEventListener('click', function() {
        const numChars = parseInt(document.getElementById('num-chars-to-undo').value, 10);
        if (numChars > 0) {
            undoTyping(numChars);
        }
    });

    document.getElementById('undo-last-line').addEventListener('click', function() {
        undoLastLine(LINE_START_TOLERANCE);
    });

    const typingSpeedSlider = document.getElementById('typing-speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    const numCharsInput = document.getElementById('num-chars-to-undo');

    // Initialize typing speed from localStorage or set default
    const savedTypingSpeed = localStorage.getItem('typingSpeed');
    if (savedTypingSpeed) {
        TYPE_SPEED = parseInt(savedTypingSpeed, 10);
        typingSpeedSlider.value = TYPE_SPEED;
        speedDisplay.textContent = TYPE_SPEED;
    }

    // Initialize number of characters to undo from localStorage or set default
    const savedNumChars = localStorage.getItem('numCharsToUndo');
    if (savedNumChars) {
        numCharsInput.value = parseInt(savedNumChars, 10);
    }

    // Event listener for typing speed changes
    typingSpeedSlider.addEventListener('input', function() {
        TYPE_SPEED = parseInt(this.value, 10);
        speedDisplay.textContent = TYPE_SPEED;
        localStorage.setItem('typingSpeed', TYPE_SPEED);
    });

    typingSpeedSlider.addEventListener('input', function() {
        TYPE_SPEED = parseInt(this.value, 10);
        speedDisplay.textContent = TYPE_SPEED;
        localStorage.setItem('typingSpeed', TYPE_SPEED);
    });

    // Event listener for undo character changes
    numCharsInput.addEventListener('input', function() {
        const numChars = parseInt(this.value, 10);
        localStorage.setItem('numCharsToUndo', numChars);
    });

    loadSources();
});
