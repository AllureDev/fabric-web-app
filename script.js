// Replace with your Google Sheet JSON URL
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OaLsjBSqyZyGsqN-qnCh-JB4E0QfUlAX_5Rgam5pIkY/gviz/tq?tqx=out:json';

async function fetchFabrics() {
    try {
        console.log('Fetching data from:', SHEET_URL);
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw response length:', text.length);

        // Extract JSON from Google Sheets response
        const json = JSON.parse(text.slice(47, -2));
        const rows = json.table.rows;
        console.log('Parsed rows:', rows);

        // Map rows to fabric objects
        const fabrics = rows.map(row => ({
            name: row.c[0]?.v || 'Unnamed',
            type: row.c[1]?.v || 'Unknown Type',
            size: row.c[2]?.v || 'Unknown Size',
            imageLink: convertDropboxLink(row.c[3]?.v || '')
        }));
        console.log('Fabric data with image links:', fabrics);

        displayFabrics(fabrics);
        setupFilters(fabrics);
    } catch (error) {
        console.error('Error fetching fabrics:', error);
        document.getElementById('fabricGrid').innerHTML = '<p>Error loading fabrics. Check console for details.</p>';
    }
}

// Convert Dropbox shareable link to direct image URL
function convertDropboxLink(link) {
    if (!link) {
        console.warn('No image link provided');
        return 'https://via.placeholder.com/150?text=No+Image';
    }

    if (link.includes('dropbox.com')) {
        const directLink = link.replace('?dl=0', '?raw=1').replace('?dl=1', '?raw=1');
        console.log('Converted Dropbox link:', directLink);
        return directLink;
    }

    console.log('Using provided link as-is:', link);
    return link;
}

// Display fabrics in grid
function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = ''; // Clear existing content

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No fabrics found.</p>';
        return;
    }

    fabrics.forEach(fabric => {
        // Create card
        const card = document.createElement('div');
        card.className = 'fabric-card';
        card.style.cursor = 'pointer'; // Set cursor to hand

        // Create image
        const img = document.createElement('img');
        img.src = fabric.imageLink;
        img.alt = fabric.name;
        img.style.maxWidth = '100%'; // Ensure image fits card
        img.onerror = () => {
            console.error('Image failed to load:', fabric.imageLink);
            img.src = 'https://via.placeholder.com/150?text=Image+Error';
        };
        img.onload = () => console.log('Image loaded successfully:', fabric.imageLink);

        // Create text elements
        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>Name:</strong> ${fabric.name}`;

        const typeP = document.createElement('p');
        typeP.innerHTML = `<strong>Type:</strong> ${fabric.type}`;

        const sizeP = document.createElement('p');
        sizeP.innerHTML = `<strong>Size:</strong> ${fabric.size}`;

        // Append elements to card
        card.appendChild(img);
        card.appendChild(nameP);
        card.appendChild(typeP);
        card.appendChild(sizeP);

        // Add click event to open full-resolution image
        card.addEventListener('click', () => {
            console.log('Card clicked, opening:', fabric.imageLink);
            window.open(fabric.imageLink, '_blank');
        });

        // Append card to grid
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