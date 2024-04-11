const endpoint = "https://todo.hackrpi.com";

const API_KEY = "e0624db2f103ed0df52e916b5677ab59";

//Get status with /status GET endpoint
async function getStatus() {
    try {
        const response = await fetch(`${endpoint}/status`, {
            method: 'GET',
            headers: {
                'authorization': API_KEY,
                "Content-Type": "application/json"
            }
        });
        const status = await response.json();
        document.getElementById("status").innerText = status.message;

    } catch (error) {
        console.error("error fetching status: ", error);
    }
}
async function fetchLists() {
    try {
        let tempToken = null;
        let lists = [];
        do {
            const url = `${endpoint}/GetLists/${tempToken !== null ? "?" + new URLSearchParams({nextToken: tempToken}) : ""}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'authorization': API_KEY,
                    "Content-Type": "application/json"
                }
            });
            const newLists = await response.json();
            tempToken = ""
            if(newLists.status == "200"){
                lists = lists.concat(newLists.lists);
                tempToken = newLists.nextToken; // Assuming the nextToken is returned in the response
                console.log(lists);
            }
        } while (tempToken !== null);
        await renderLists(lists);
    } catch (error) {
        console.error("error fetching lists: ", error);
    }
}

//Adds list through /AddList POST endpoint. 
async function addList() {
    const title = newListInputElement.value.trim();
    if (title) {
        try{
            const response = await fetch(`${endpoint}/AddList`, {
                method: 'POST',
                headers: {
                    'authorization': API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    listName: title
                })
            });
            const newList = await response.json();
            if (newList.status == "200") {
                renderList({
                    id: newList.list.id,
                    listName: newList.list.listName,
                    items: []
                });
            }
            newListInputElement.value = "";
        } catch (error) {
            console.error("error adding list: ", error);
        }
    }
}

//Deletes list through /DeleteList DELETE endpoint
async function deleteList(listIdParam) {
    try {
        const url = `${endpoint}/DeleteList?${new URLSearchParams({ listId: listIdParam })}`;
        await fetch(url, {
            method: 'DELETE',
            headers: {
                'authorization': API_KEY,
                "Content-Type": "application/json"
            }
        });
        const listElement = document.getElementById(`list-${listIdParam}`);
        listElement.classList.add("FadeOut");
        setTimeout(function() {
            listElement.remove();
        }, 500);
        
    } catch (error) {
        console.error("error deleting list: ", error);
    }
}

//Get all list items using GetListItems GET endpoint until next token is exhausted
async function getListItems(listIdParam){
    try {
        let listItems = [];
        const getListReponse = await loopRequest();
        async function loopRequest(newToken=null) {
            const url = `${endpoint}/GetListItems/${newToken !== null ? "?" + new URLSearchParams({
                listId : listIdParam,
                nextToken: newToken
            }) : "?" + new URLSearchParams({listId: listIdParam})}` ;
            console.log(url); // Log the URL
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'authorization': API_KEY,
                    "Content-Type": "application/json"
                }
            });
            // process the response
            const newItems = await response.json();
            if(newItems.status == "200"){
                listItems = listItems.concat(newItems.listItems);
            }
            console.log(listItems); 
            if(newItems.nextToken && newItems.nextToken !== null) {
                return loopRequest(newItems.nextToken);
            } else {
                return listItems;
            }
        }
        return getListReponse;
    } catch (error) {
        console.error("error fetching list items: ", error);
    }
}

//Adds task through /AddListItem post endpoint
async function addTask(listIdParam) {
    const taskInput = document.getElementById(`task-input-${listIdParam}`);
    const description = taskInput.value.trim();
    if (description) {
        try {
            const response = await fetch(`${endpoint}/AddListItem`, {
                method: 'POST',
                headers: {
                    'authorization': API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    listId: listIdParam,
                    itemName: description
                })
            });
            const newTask = await response.json();
            if(newTask.status == "200"){
                createTaskElement(
                    newTask.listItem, listIdParam);
            }
            
            taskInput.value = "";
        } catch (error) {
            console.error("error adding task: ", error);
        }
    }
}


//Rename task through /RenameItem/ PATCH endpoint
async function renameTask(thisItemId, newName) {
    try {
        const url = `${endpoint}/RenameItem?${new URLSearchParams({
            itemId: thisItemId,
            itemName: newName
        })}`;
        await fetch(url, {
            method: 'PATCH',
            headers: {
                'authorization': API_KEY,
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        console.error("error renaming task: ", error);
    }
}

//Set checked task through /SetChecked/ PATCH endpoint
async function setCheckedTask(thisItemId, newChecked) {
    try {
        const url = `${endpoint}/SetChecked?${new URLSearchParams({
            itemId: thisItemId,
            checked: newChecked
        })}`;
        await fetch(url, {
            method: 'PATCH',
            headers: {
                'authorization': API_KEY,
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        console.error("error setting checked task: ", error);
    }
    
}

//Deletes task through /DeleteListItem/ DELETE endpoint
async function deleteTask(taskId) {
    try {
        const url = `${endpoint}/DeleteListItem?${new URLSearchParams({
            itemId: taskId
        })}`;
        await fetch(url, {
            method: 'DELETE',
            headers: {
                'authorization': API_KEY,
                "Content-Type": "application/json"
            }
        });
        const taskElement = document.getElementById(`task-${taskId}`);
        taskElement.classList.add("FadeOut");
        setTimeout(function() {
            taskElement.remove();
        }, 500);
    } catch (error) {
        console.error("error deleting task: ", error);
    }
    
}


const addListElement = document.getElementById("add-list");
const listContainerElement = document.getElementById('list-container');
const newListInputElement = document.getElementById('new-list-input');

//Event listeners for menu
addListElement.addEventListener("click", function(){
    addList();
});

newListInputElement.onkeydown = function(e){
    if(e.key === "Enter"){
        addList();
    }
};

//Renders each list given an array of list objects
async function renderLists(lists) {
    //To preserve the sequence of lists, use for loop instead of forEach (which would run functions in parallel)
    let listItems;
    for (const e of lists){
        listItems = await getListItems(e.id);
        renderList({
            id: e.id,
            listName: e.listName,
            items: listItems
        });
    }
    let loadingEl=document.getElementById('loading');
    if(loadingEl!==null) loadingEl.remove();
    
}



const listHTML = `
<div class="list">
    <h2 class="list-header"></h2>
    <input type="text">
    <button>Add</button>
    <button>Delete List</button>
    <div class="item-list"></div>
</div>
`;

//Renders list
function renderList(list) {
    let tempHTML = `
    <div id="list-${list.id}" class="list">
        <h2 class="list-header">${list.listName}</h2>
        <input id="task-input-${list.id}" type="text" value="" class="text-input">
        <button id="add-items-${list.id}">Add</button>
        <button id="delete-list-${list.id}">Delete List</button>
        <div class="item-list"></div>
    </div>
    `;

    let loadingEl=document.getElementById('loading');
    if(loadingEl!==null) loadingEl.remove();

    document.getElementById("list-container").insertAdjacentHTML("afterbegin", tempHTML);
    document.getElementById(`delete-list-${list.id}`).onclick = () => deleteList(list.id);
    document.getElementById(`add-items-${list.id}`).onclick = () => addTask(list.id);
    document.getElementById(`task-input-${list.id}`).onkeydown = (e) => { 
        if(e.key === "Enter"){
            addTask(list.id)
        }
    };
    
    list.items.forEach(task => {
        createTaskElement(task, list.id);
    });

}

//Renders each to-do task
function createTaskElement(task, listId) {
    let tempHTML = `
    <div id="task-${task.id}" class="item${task.checked ? " completed":""}">
        <label class="checkbox-label">
            <input id="checkbox-${task.id}" type="checkbox" ${task.checked ? "checked":""}>
            <div class="checkbox-display"></div>
        </label>
        <input id="input-${task.id}" "type="text" value="${task.itemName}" class="text-input task-input">
        <button id="delete-${task.id}">Delete Item</button>
    </div>
    `;

    document.getElementById("list-"+listId).querySelector(".item-list").insertAdjacentHTML("afterbegin", tempHTML);
    document.getElementById(`input-${task.id}`).onchange = (e) => {
        renameTask(task.id, document.getElementById(`input-${task.id}`).value);
    };
    document.getElementById(`checkbox-${task.id}`).onchange = function(e){
        document.getElementById(`task-${task.id}`).classList.toggle('completed', e.target.checked);
        setCheckedTask(task.id, e.target.checked);
    };
    document.getElementById(`delete-${task.id}`).onclick = () => deleteTask(task.id);

}


fetchLists();
getStatus();