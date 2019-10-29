$(function () {
  clearUi()

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: 'your_api_key',
    authDomain: 'your_project_id.firebaseapp.com',
    databaseURL: 'https://your_database_name.firebaseio.com',
    projectId: 'add_your_project_id',
    storageBucket: 'your_bucket_name.appspot.com',
    storageBucket: 'add_your_storage_bucket_url',
    messagingSenderId: 'add_your_messaging_sender_id',
    appId: 'add_your_app_id'
  }

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig)
  const dbTasks = firebase.firestore().collection('tasks')

  // -------- **AUTHENTICATION*** -------------------

  const uiConfig = {
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        console.log(authResult)
        console.log(redirectUrl)
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        return false
      }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    signInSuccessUrl: '<url-to-redirect-to-on-success>',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebase.auth.GoogleAuthProvider.PROVIDER_ID
      // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      // firebase.auth.GithubAuthProvider.PROVIDER_ID,
      // firebase.auth.EmailAuthProvider.PROVIDER_ID,
      // firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ],
    // Terms of service url.
    tosUrl: '<your-tos-url>',
    // Privacy policy url.
    privacyPolicyUrl: '<your-privacy-policy-url>'
  }

  const ui = new firebaseui.auth.AuthUI(firebase.auth())
  ui.start('#login-container', uiConfig)

  let firebaseUserUid

  // listen for changes to the Auth state of the user
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      console.log('*** Auth State Changed ***')
      // User is signed in.
      const displayName = user.displayName
      const email = user.email
      const emailVerified = user.emailVerified
      const photoUrl = user.photoURL
      const isAnonymous = user.isAnonymous
      firebaseUserUid = user.uid
      const providerData = user.providerData

      console.log(displayName)
      console.log(email)
      console.log(photoUrl)
      console.log(firebaseUserUid)

      showTodoUi(displayName, email, photoUrl)
      // ...
    } else {
      console.log('in onAuthStateChanged sign out clause')
      // User is signed out.
      showLoginUi()
      // ...
    }
  })

  // Firebase API - listen for click event on #sign-out button
  // and then call `firebase.auth().signOut` to sign the user out
  $('body').on('click', '#sign-out', function () {
    console.log('signing the user out')

    firebase.auth().signOut().then(function () {
      // Sign-out successful.
      // show the loginUi when signout is successful
      // showLoginUi()
      ui.start('#login-container', uiConfig)
    }).catch(function (error) {
      // An error happened.
      alert('an error occurred during the logout process')
    })
  })

  // -------- **CREATE** ---------

  // listener that listens for a
  // submit event on the #add-item form
  $('#add-item').submit(function (event) {
    event.preventDefault()

    // Read the value from the input field and store it in a variable
    const newTaskName = $('#new-task').val()
    console.log(newTaskName)

    // clear out the input field
    $('#new-task').val('')

    // Firebase API - create task in firebase
    dbTasks.add({
      name: newTaskName,
      completed: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      user: firebaseUserUid
    })

    fetchData()
  })

  // -------- **READ** ---------

  // function that "Reads" data from firestore when called
  function fetchData () {
    console.log(firebaseUserUid)

    // Firebase API - fetch tasks based on query below
    dbTasks.where('user', '==', firebaseUserUid).orderBy('timestamp', 'asc')
      .get()
      .then((snapshot) => {
        // clear task list
        $('#task-list').html('')

        snapshot.forEach((doc) => {
          const taskId = doc.id
          const taskName = doc.data().name
          const isComplete = doc.data().completed

          const taskHtml = buildTaskHtml(taskName, isComplete)

          $('#task-list').append(`<li id="${taskId}">${taskHtml}</li>`)
        })
      }, function (error) {
        console.log(error)
      })
  }

  // -------- **UPDATE** ---------

  // The listeners below are using jQuery's .on() method
  // and attaching event listeners to the <body>
  // which allows us to listen to events for
  // elements that are dynamically added
  // after the initial page load

  // Listener for change event on the checkboxes
  $('body').on('change', '#task-list li input[type="checkbox"]', function () {
    // toggle a 'done' class that applies a line-through style to a task
    $(this).parent().toggleClass('done')
    const taskId = $(this).parent().parent().attr('id')
    console.log(taskId)

    // Firebase API
    // If li now has'done' class, mark task in Firebase as "completed"
    // If li does not a 'done' class, mark task in Firebase as "incomplete" (or complette = false)

    if ($(this).parent().hasClass('done')) {
      dbTasks.doc(taskId).update({ completed: true })
    } else {
      dbTasks.doc(taskId).update({ completed: false })
    }
  })

  // listen for click event on the "edit" link
  // and display edit task form
  $('body').on('click', '#task-list a.edit-task', function () {
    const taskName = $(this).parent().find('span.task-label').text()

    // display edit task form
    // with two buttons 'update' and 'cancel'
    const editTaskFormHtml = buildEditTaskFormHtml(taskName)
    $(this).parent().parent().html(editTaskFormHtml)
  })

  // Listen for click event 'save' button
  // to save changes made to the task
  $('body').on('click', '#save-update', function () {
    // Stores the new task in a variable
    const updatedTaskName = $('#update-task').val()
    const taskId = $(this).parent().attr('id')
    console.log('updated key', taskId)

    // Firebase API - update task in firebase
    dbTasks.doc(taskId).update({ name: updatedTaskName })

    fetchData()

    // Display new task name with checkbox
    // const taskHtml = buildTaskHtml(updatedTaskName)
    // $(this).parent().html(taskHtml)
  })

  // Listener that reverts back to the current
  // task name when user clicks 'cancel' button
  $('body').on('click', '#cancel-update', function () {
    // Stores the current task in a variable
    const taskName = $('#update-task').val()

    // Redisplay current task name with checkbox
    const taskHtml = buildTaskHtml(taskName)
    $(this).parent().html(taskHtml)
  })

  // -------- **DELETE** ---------

  $('body').on('click', '#task-list a.delete-task', function () {
    const removedTaskId = $(this).parent().parent().attr('id')

    // Firebase API - delete task in firebase
    dbTasks.doc(removedTaskId).delete()

    fetchData()
    // $(this).parent().parent().remove()
  })

  // -------- Utility Functions ---------

  // html template for a task
  function buildTaskHtml (taskName, isComplete) {
    let checkedAttribute = isComplete ? "checked='checked'" : ''
    let doneClass = isComplete ? 'done' : ''
    return (
      `<label class='checkbox-inline ${doneClass}'>
        <input type='checkbox' ${checkedAttribute} name='items' />

        <span class="task-label"> ${taskName}</span>
        <a href="#" class='edit-task'>edit</a>
        <a href="#" class='delete-task'>delete</a>
      </label>`
    )
  }

  // html template for a edit task form
  function buildEditTaskFormHtml (taskName) {
    return (
      `<input class='form-control' type='text' id='update-task' value="${taskName}">
      <button class='btn btn-primary' href='#' id='save-update'>
        update
      </button>
      <button class='btn btn-default' href='#' id='cancel-update'>
        cancel
      </button>
      `
    )
  }

  function buildUserProfileHtml (name, email, photoURL) {
    return (
      `
        <div class='profile-pic'>
          <img src=${photoURL}>
        </div>
        <div class='contact-info'>
          <p>${name}</p>
          <p>${email}</p>
          <a href='#' id='sign-out'>signout</a>
        </div>
      `
    )
  }

  // clear login UI and todo UI when the initial app load and
  // on every page refresh
  // firebase.onAuthStateChanged() will determine which UI element should
  // be shown (login UI or todo UI)

  function clearUi () {
    $('.loading').show()
    $('#login-container').hide()
    $('#main-container').hide()
  }

  //
  function showTodoUi (name, email, photoUrl) {
    $('#main-container').show()
    $('#login-container').hide()
    $('.loading').hide()

    const userProfileHtml = buildUserProfileHtml(name, email, photoUrl)
    $('.user-info').html(userProfileHtml)

    fetchData()
  }

  function showLoginUi () {
    $('.user-info').html('')
    $('#main-container').hide()
    $('#login-container').show()
    $('.loading').hide()
  }
})
