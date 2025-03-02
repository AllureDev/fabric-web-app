// Google Sheet JSON URL for "Sample Fabrics"
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OaLsjBSqyZyGsqN-qnCh-JB4E0QfUlAX_5Rgam5pIkY/gviz/tq?tqx=out:json&sheet=Sample Fabrics';

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
        const cols = json.table.cols; // Get column headers
        console.log('Parsed rows:', rows);

        // Map headers to indices dynamically
        const headerMap = {};
        cols.forEach((col, index) => {
            headerMap[col.label] = index;
        });

        // Define all columns we care about
        const allHeaders = ["SKU", "Type", "Name", "Family", "Colour", "Band Width", "Roll Width", "Schedule", "Status", "Image Link"];

        // Map rows to fabric objects
        const fabrics = rows.map(row => {
            const fabric = {};
            allHeaders.forEach(header => {
                fabric[header] = row.c[headerMap[header]]?.v || '';
            });
            fabric.imageLink = sanitizeImageLink(fabric["Image Link"]);
            return fabric;
        });
        console.log('Fabric data with image links:', fabrics);

        displayFabrics(fabrics);
        setupFilters(fabrics);
    } catch (error) {
        console.error('Error fetching fabrics:', error);
        document.getElementById('fabricGrid').innerHTML = '<p>Error loading fabrics. Check console for details.</p>';
    }
}

// Sanitize and validate image link (works with any direct URL)
function sanitizeImageLink(link) {
    if (!link) {
        console.warn('No image link provided');
        return 'https://via.placeholder.com/150?text=No+Image';
    }

    // Check if the link is a valid URL and likely an image
    try {
        const url = new URL(link);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const isImage = imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
        
        if (!isImage) {
            console.warn('Link may not be an image:', link);
        }
        
        console.log('Using direct image link:', link);
        return link;
    } catch (e) {
        console.error('Invalid URL provided:', link);
        return 'https://via.placeholder.com/150?text=Invalid+Link';
    }
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

        // Create image
        const img = document.createElement('img');
        img.src = fabric.imageLink;
        img.alt = fabric.Name;
        img.onerror = () => {
            console.error('Image failed to load:', fabric.imageLink);
            img.src = 'https://via.placeholder.com/150?text=Image+Error';
        };
        img.onload = () => console.log('Image loaded successfully:', fabric.imageLink);

        // Create name element
        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name}</strong>`;

        // Append elements to card
        card.appendChild(img);
        card.appendChild(nameP);

        // Add click event to show details
        card.addEventListener('click', () => showFabricDetails(fabric));

        // Append card to grid
        grid.appendChild(card);
    });
}

// Show fabric details on click
function showFabricDetails(fabric) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <img src="${fabric.imageLink}" alt="${fabric.Name}" style="max-width:100%;">
            <h2>${fabric.Name}</h2>
            <p><strong>SKU:</strong> ${fabric.SKU}</p>
            <p><strong>Type:</strong> ${fabric.Type}</p>
            <p><strong>Family:</strong> ${fabric.Family}</p>
            <p><strong>Colour:</strong> ${fabric.Colour}</p>
            <p><strong>Band Width:</strong> ${fabric["Band Width"]}</p>
            <p><strong>Roll Width:</strong> ${fabric["Roll Width"]}</p>
            <p><strong>Schedule:</strong> ${fabric.Schedule}</p>
            <p><strong>Status:</strong> ${fabric.Status}</p>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal on click
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Set up search and filter functionality
function setupFilters(allFabrics) {
    const typeFilter = document.getElementById('typeFilter');
    const familyFilter = document.getElementById('familyFilter');
    const colourFilter = document.getElementById('colourFilter');
    const bandWidthFilter = document.getElementById('bandWidthFilter');
    const rollWidthFilter = document.getElementById('rollWidthFilter');
    const scheduleFilter = document.getElementById('scheduleFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Log to debug
    console.log('All Band Width values:', allFabrics.map(f => f["Band Width"]));

    // Populate filter options dynamically with type safety
    const types = [...new Set(allFabrics.map(f => String(f.Type || '')))];
    const families = [...new Set(allFabrics.map(f => String(f.Family || '')))];
    const colours = [...new Set(allFabrics.map(f => String(f.Colour || '')))];
    const bandWidths = [...new Set(allFabrics.map(f => String(f["Band Width"] || '')))];
    const schedules = [...new Set(allFabrics.map(f => String(f.Schedule || '')))];
    const statuses = [...new Set(allFabrics.map(f => String(f.Status || '')))];

    typeFilter.innerHTML = '<option value="">All Types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
    familyFilter.innerHTML = '<option value="">All Families</option>' + families.map(f => `<option value="${f}">${f}</option>`).join('');
    colourFilter.innerHTML = '<option value="">All Colours</option>' + colours.map(c => `<option value="${c}">${c}</option>`).join('');
    bandWidthFilter.innerHTML = '<option value="">All Band Widths</option>' + bandWidths.map(b => `<option value="${b}">${b}</option>`).join('');
    scheduleFilter.innerHTML = '<option value="">All Schedules</option>' + schedules.map(s => `<option value="${s}">${s}</option>`).join('');
    statusFilter.innerHTML = '<option value="">All Statuses</option>' + statuses.map(s => `<option value="${s}">${s}</option>`).join('');

    function filterFabrics() {
        const selectedType = typeFilter.value;
        const selectedFamily = familyFilter.value;
        const selectedColour = colourFilter.value;
        const selectedBandWidth = bandWidthFilter.value;
        const rollWidthValue = parseFloat(rollWidthFilter.value) || 0;
        const selectedSchedule = scheduleFilter.value;
        const selectedStatus = statusFilter.value;

        const filtered = allFabrics.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            return (
                (!selectedType || fabric.Type === selectedType) &&
                (!selectedFamily || fabric.Family === selectedFamily) &&
                (!selectedColour || fabric.Colour === selectedColour) &&
                (!selectedBandWidth || String(fabric["Band Width"]) === selectedBandWidth) &&
                (rollWidthValue === 0 || rollWidthNum >= rollWidthValue) &&
                (!selectedSchedule || fabric.Schedule === selectedSchedule) &&
                (!selectedStatus || fabric.Status === selectedStatus)
            );
        });

        displayFabrics(filtered);
    }

    typeFilter.addEventListener('change', filterFabrics);
    familyFilter.addEventListener('change', filterFabrics);
    colourFilter.addEventListener('change', filterFabrics);
    bandWidthFilter.addEventListener('change', filterFabrics);
    rollWidthFilter.addEventListener('input', filterFabrics);
    scheduleFilter.addEventListener('change', filterFabrics);
    statusFilter.addEventListener('change', filterFabrics);
}

// Load fabrics when page loads
fetchFabrics();
