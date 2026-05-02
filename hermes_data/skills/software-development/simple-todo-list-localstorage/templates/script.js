// script.js for simple todo list using localStorage

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const list = document.getElementById('todo-list');

    // Load todos from localStorage
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function renderTodos() {
        list.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            if (todo.completed) li.classList.add('completed');

            const span = document.createElement('span');
            span.className = 'todo-text';
            span.textContent = todo.text;
            li.appendChild(span);

            const actions = document.createElement('div');
            actions.className = 'todo-actions';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'edit-btn';
            editBtn.addEventListener('click', () => {
                const newText = prompt('Edit your todo:', todo.text);
                if (newText !== null && newText.trim() !== '') {
                    todo.text = newText.trim();
                    saveTodos();
                    renderTodos();
                }
            });
            actions.appendChild(editBtn);

            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = todo.completed ? 'Undo' : 'Complete';
            toggleBtn.className = todo.completed ? 'undo-btn' : 'complete-btn';
            toggleBtn.addEventListener('click', () => {
                todo.completed = !todo.completed;
                saveTodos();
                renderTodos();
            });
            actions.appendChild(toggleBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', () => {
                todos.splice(index, 1);
                saveTodos();
                renderTodos();
            });
            actions.appendChild(deleteBtn);

            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            todos.push({ text, completed: false });
            input.value = '';
            saveTodos();
            renderTodos();
        }
    });

    // Initial render
    renderTodos();
});