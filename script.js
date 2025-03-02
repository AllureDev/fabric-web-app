// Replace with your Google Sheet JSON URL
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OaLsjBSqyZyGsqN-qnCh-JB4E0QfUlAX_5Rgam5pIkY/gviz/tq?tqx=out:json';

async function fetchFabrics() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        // Extract JSON from Google Sheets response
        const json = JSON.parse(text.slice(47, -2));
        const rows = json.table.rows;

        // Map rows to fabric objects
        const fabrics = rows.map(row => ({
            name: row.c[0]?.v || '',
            type: row.c[1]?.v || '',
            size: row.c[2]?.v || '',
            imageLink: convertDriveLink(row.c[3]?.v || '')
        }));

        displayFabrics(fabrics);
        setupFilters(fabrics);
    } catch (error) {
        console.error('Error fetching fabrics:', error);
    }
}

// Convert Google Drive view link to direct image URL
function convertDriveLink(link) {
    if (!link) return '';
    const fileIdMatch = link.match(/\/d\/(.+?)\//);
    if (fileIdMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    return link; // Return original if no match
}

// Display fabrics in grid
function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = ''; // Clear existing content

    fabrics.forEach(fabric => {
        const card = document.createElement('div');
        card.className = 'fabric-card';
        card.innerHTML = `
            <img src="${fabric.imageLink}" alt="${fabric.name}">
            <p><strong>Name:</strong> ${fabric.name}</p>
            <p><strong>Type:</strong> ${fabric.type}</p>
            <p><strong>Size:</strong> ${fabric.size}</p>
        `;
        grid.appendChild(card);
    });
}

// Set up search and filter functionality
function setupFilters(allFabrics) {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const sizeFilter = document.getElementById('sizeFilter');

    function filterFabrics() {
        const searchText = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;
        const selectedSize = sizeFilter.value;

        const filtered = allFabrics.filter(fabric => {
            const matchesSearch = fabric.name.toLowerCase().includes(searchText);
            const matchesType = !selectedType || fabric.type === selectedType;
            const matchesSize = !selectedSize || fabric.size === selectedSize;
            return matchesSearch && matchesType && matchesSize;
        });

        displayFabrics(filtered);
    }

    searchInput.addEventListener('input', filterFabrics);
    typeFilter.addEventListener('change', filterFabrics);
    sizeFilter.addEventListener('change', filterFabrics);
}

// Load fabrics when page loads
fetchFabrics();