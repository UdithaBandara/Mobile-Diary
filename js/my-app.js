var os;
var transaction;
var store;
var db;

// Initialize your app
var mobileDiary = new Framework7();

// Export selectors engine
var $$ = Dom7;

// Add view
var mainView = mobileDiary.addView('.view-main', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});

mobileDiary.onPageInit('newEntry', function (page) {
    Date.prototype.toDateInputValue = function () {
        var local = new Date(this);
        local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
        return local.toJSON().slice(0, 10);
    }
    $('#datePicker').val(new Date().toDateInputValue());
});

$(document).ready(function () {
    //Listen for device
    document.addEventListener('deviceready', onDeviceReady, false);
});

function onDeviceReady() {
    //Display quick note
    getQuickNote();

    mobileDiary.onPageInit('index', function (page) {
        getQuickNote();
    });

    var request = indexedDB.open("mobilediary", 2);

    request.onupgradeneeded = function (event) {
        db = event.target.result;

        //Creating Subjects table
        console.log("Inside the function.")
        if (!db.objectStoreNames.contains("subjects")) {
            os = db.createObjectStore("subjects", {
                keyPath: "id"
                , autoIncrement: true
            });

            os.createIndex("title", "title", {
                unique: false
            });
        }

        //Creating Entries table
        if (!db.objectStoreNames.contains("entries")) {
            os = db.createObjectStore("entries", {
                keyPath: "id"
                , autoIncrement: true
            });

            os.createIndex("title", "title", {
                unique: false
            });
            os.createIndex("subject", "subject", {
                unique: false
            });
            os.createIndex("date", "date", {
                unique: false
            });
            os.createIndex("body", "body", {
                unique: false
            });
        }
    }

    request.onsuccess = function (event) {
        console.log("Success: Database Opened.");
        db = event.target.result;

        getSubjects();

        mobileDiary.onPageInit('index', function (page) {
            getSubjects();
        });

        mobileDiary.onPageInit('newEntry', function (page) {
            getSubjectList();
        });
    }

    request.onerror = function (event) {
        console.log("Error: Error opening database.");
    }
}

//Saving subjects
function addSubject() {
    var title = $('#title').val();

    transaction = db.transaction(["subjects"], "readwrite");

    store = transaction.objectStore("subjects");

    //Define store
    var subject = {
        title: title
    }

    var request = store.add(subject);

    request.onsuccess = function (event) {
        console.log("Success: Subject added.");
    }

    request.onerror = function (event) {
        console.log("Error: Error adding subject.");
    }
}

//Get subjects to main frame
function getSubjects() {
    transaction = db.transaction(["subjects"], "readonly");

    store = transaction.objectStore("subjects");

    var index = store.index("title");

    var output = "";

    index.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            output += '<li>' +
                '<a onclick="getEntries(' + cursor.value.id + ')" href="entries.html" class="item-link">' +
                '<div class="item-content">' +
                '<div class="item-inner">' +
                '<div class="item-title">' + cursor.value.title + '</div>' +
                '</div>' +
                '</div>' +
                '</a>' +
                '</li>';
            cursor.continue();
        }
        $('#subjectsList').html(output);
    }
}

//Get subjects to new entry page
function getSubjectList(current) {
    transaction = db.transaction(["subjects"], "readonly");

    store = transaction.objectStore("subjects");

    var index = store.index("title");

    var output = "";

    index.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            if (cursor.value.id == current) {
                output += '<option value="' + cursor.value.id + '" selected>' + cursor.value.title + '</option>';
            } else {
                output += '<option value="' + cursor.value.id + '">' + cursor.value.title + '</option>';
            }
            cursor.continue();
        }
        $('#subjectSelect').html(output);
    }
}

//Saving an entry
function addEntry() {
    var title = $('#title').val();
    var subject = $('#subjectSelect').val();
    var date = $('#datePicker').val();
    var body = $('#body').val();

    transaction = db.transaction(["entries"], "readwrite");

    store = transaction.objectStore("entries");

    //Define store
    var entry = {
        title: title
        , subject: subject
        , date: date
        , body: body
    }

    var request = store.add(entry);

    request.onsuccess = function (event) {
        console.log("Success: Entry added.");
    }

    request.onerror = function (event) {
        console.log("Error: Error adding entry.");
    }
}

//Fetch and display entries
function getEntries(subjectId) {
    mobileDiary.onPageInit('entries', function (page) {
        getSubjectTitle(subjectId);

        transaction = db.transaction(["entries"], "readonly");

        store = transaction.objectStore("entries");

        var index = store.index("title");

        var output = "";

        index.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                if (cursor.value.subject == subjectId) {
                    output += '<li>' +
                        '<a onclick="getEntry(' + cursor.value.id + ')" href="entry.html" class="item-link">' +
                        '<div class="item-content">' +
                        '<div class="item-inner">' +
                        '<div class="item-title">' + cursor.value.title + '</div>' +
                        '</div>' +
                        '</div>' +
                        '</a>' +
                        '</li>';
                }
                cursor.continue();
            }
            $('#entryList').html(output);
        }
    });
}

//Setting subject name on entries page
function getSubjectTitle(subjectId) {
    transaction = db.transaction(["subjects"], "readonly");

    store = transaction.objectStore("subjects");

    var request = store.get(subjectId);

    request.onsuccess = function (event) {
        var subjectTitle = request.result.title;
        $('#subjectTitle').html(subjectTitle);
    }
}

//Get entry details
function getEntry(entryId) {
    mobileDiary.onPageInit('entry', function (page) {
        transaction = db.transaction(["entries"], "readonly");

        store = transaction.objectStore("entries");

        var request = store.get(entryId);

        request.onsuccess = function (event) {
            $('#editForm').attr('onsubmit', 'editEntry(' + entryId + ')');
            $('.entryTitle').html(request.result.title);
            $('#entryDate').html(request.result.date);
            $('#entryBody').html(request.result.body);

            //Edit form fields
            getSubjectList(request.result.subject);
            $('#title').attr('value', request.result.title);
            $('#datePicker').attr('value', request.result.date);
            $('#body').html(request.result.body);

            $('#editBtn').html('<a href="#" onclick="showEditForm()" class="button button-big button-fill color-blue">Edit</a>');
            $('#deleteBtn').html('<a href="index.html" onclick="removeEntry(' + entryId + ')" class="button button-big button-fill color-red">Delete</a>');
        }
    });
}

//Delete an entry
function removeEntry(entryId) {
    transaction = db.transaction(["entries"], "readwrite");

    store = transaction.objectStore("entries");

    var request = store.delete(entryId);

    request.onsuccess = function (event) {
        console.log("Entry removed.")
    }
}

//Display edit form
function showEditForm() {
    $('#editForm').slideToggle();
}

//Edit entry
function editEntry(entryId) {
    transaction = db.transaction(["entries"], "readwrite");

    store = transaction.objectStore("entries");

    var request = store.get(entryId);

    request.onsuccess = function (event) {
        var data = request.result;

        //Get new data
        data.title = $('#title').val();
        data.subject = $('#subjectSelect').val();
        data.date = $('#datePicker').val();
        data.body = $('#body').val();

        //Store update
        var requestUpdate = store.put(data);

        requestUpdate.onsuccess = function (event) {
            console.log("Success: Subject Updated.");
        }

        requestUpdate.onerror = function (event) {
            console.log("Error: Error updating subject.");
        }
    }
}

//Show note form
function showNoteForm() {
    $('#quickNote').toggle();
    $('#quickNoteForm').toggle();
}

//Get quick note
function getQuickNote() {
    if (localStorage.note == null) {
        $('#quickNote').html('You can add a quick note here. Just press the button below to update a quick note.')
    } else {
        $('#quickNote').html(localStorage.note);
    }
}

//Save quick note
function saveQuickNote() {
    var newNote = $('#note').val();
    localStorage.setItem('note', newNote);
}