import { importDb, exportDb, addClothingItem, getAllClothingItems, deleteClothingItem, getClothesByCategory } from './db.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let selectedColor = null;

document.getElementById('upload').addEventListener('change', function () {
    const file = this.files[0];
    const img = new Image();
    img.onload = function () {
        const maxWidth = 300;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = URL.createObjectURL(file);
});

canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const data = ctx.getImageData(x, y, 1, 1).data;

    if (data[3] === 0) { // If the clicked pixel is transparent, do nothing
        return;
    }

    const clickedColor = { r: data[0], g: data[1], b: data[2] };

    removeBackground(ctx, canvas, clickedColor);
});

function removeBackground(ctx, canvas, selectedColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tolerance = 115;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const d = Math.sqrt((r - selectedColor.r) ** 2 + (g - selectedColor.g) ** 2 + (b - selectedColor.b) ** 2);
        if (d < tolerance) data[i + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
}

document.getElementById('export').addEventListener('click', async () => {
    try {
        const data = await exportDb();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-closet-export.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Export failed: ' + e.message);
    }
});

document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importDb(data);
        alert('Closet imported successfully!');
        await loadCloset();
        await loadCategoryItems('Top', 'top-select');
        await loadCategoryItems('Bottom', 'bottom-select');
        await loadCategoryItems('Outerwear', 'outerwear-select');
        await loadCategoryItems('Shoes', 'shoes-select');
        await loadCategoryItems('Accessory', 'accessories-select');
    } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import closet.');
    }
});

document.getElementById('save').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const category = document.getElementById('category').value;

    if (!name || !category) {
        alert("Please enter a name and choose a category.");
        return;
    }

    const image = canvas.toDataURL('image/png');

    const item = { name, category, image, dateAdded: new Date().toISOString() };

    try {
        await addClothingItem(item);
        document.getElementById('name').value = '';
        document.getElementById('category').selectedIndex = 0;

        await loadCloset();
        await loadCategoryItems('Top', 'top-select');
        await loadCategoryItems('Bottom', 'bottom-select');
        await loadCategoryItems('Outerwear', 'outerwear-select');
        await loadCategoryItems('Shoes', 'shoes-select');
        await loadCategoryItems('Accessory', 'accessories-select');
        alert("Item saved!");
    } catch (err) {
        console.error("Error saving item:", err);
        alert("Failed to save item.");
    }
});

document.getElementById('reset').addEventListener('click', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    selectedColor = null;
});

async function loadCloset() {
    try {
        const items = await getAllClothingItems();
        const container = document.getElementById('closet');
        container.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('item');

            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.title = `${item.name} (${item.category})`;

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.onclick = async () => {
                await deleteClothingItem(item.id);
                await loadCloset();
                await loadCategoryItems('Top', 'top-select');
                await loadCategoryItems('Bottom', 'bottom-select');
                await loadCategoryItems('Outerwear', 'outerwear-select');
                await loadCategoryItems('Shoes', 'shoes-select');
                await loadCategoryItems('Accessory', 'accessories-select');
            };

            div.appendChild(img);
            div.appendChild(delBtn);
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading closet:", err);
    }
}

async function loadCategoryItems(category, selectId) {
    try {
        const items = await getClothesByCategory(category);
        const select = document.getElementById(selectId);
        select.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = `Select a ${category}`;
        select.appendChild(placeholder);

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error(`Failed to load items for ${category}:`, err);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadCloset();
    await loadCategoryItems('Top', 'top-select');
    await loadCategoryItems('Bottom', 'bottom-select');
    await loadCategoryItems('Outerwear', 'outerwear-select');
    await loadCategoryItems('Shoes', 'shoes-select');
    await loadCategoryItems('Accessory', 'accessories-select');
});

['top', 'bottom', 'outerwear', 'shoes', 'accessories'].forEach(cat => {
    document.getElementById(`${cat}-select`).addEventListener('change', async (e) => {
        const category = cat.charAt(0).toUpperCase() + cat.slice(1);
        const items = await getClothesByCategory(category);
        const selectedItem = items.find(item => String(item.id) === e.target.value);
        const preview = document.getElementById(`preview-${cat}`);
        preview.innerHTML = '';

        if (selectedItem) {
            const img = document.createElement('img');
            img.src = selectedItem.image;
            img.alt = selectedItem.name;
            img.title = selectedItem.name;
            img.style.width = '12rem';
            img.style.marginTop = '10px';
            preview.appendChild(img);
        }
    });
});

document.getElementById('add-accessory').addEventListener('click', async () => {
    const container = document.getElementById('Accessory');

    const newSelect = document.createElement('select');
    const index = container.querySelectorAll('select').length + 1;
    newSelect.id = 'accessories-select-' + index;
    container.appendChild(newSelect);

    const preview = document.createElement('div');
    preview.id = `accessory-preview-${index}`;
    preview.classList.add('accessory-preview');
    container.appendChild(preview);

    const items = await getClothesByCategory('Accessory');

    newSelect.innerHTML = `<option value="" disabled selected>Select an accessory</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        newSelect.appendChild(option);
    });

    newSelect.addEventListener('change', () => {
        const selectedId = Number(newSelect.value);
        const selectedItem = items.find(item => item.id === selectedId);

        preview.innerHTML = '';
        if (selectedItem) {
            const img = document.createElement('img');
            img.src = selectedItem.image;
            img.alt = selectedItem.name;
            img.title = selectedItem.name;
            img.style.width = '12rem';
            img.style.marginTop = '10px';
            preview.appendChild(img);
        }
    });
});
