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
                // Use null coalescing to safely handle undefined values
                const cellValue = row.c[headerMap[header]];
                fabric[header] = cellValue?.v || '';
            });
            
            // Check if image link exists and is valid
            if (fabric["Image Link"] && typeof fabric["Image Link"] === 'string' && fabric["Image Link"].trim() !== '') {
                try {
                    // Basic URL validation
                    new URL(fabric["Image Link"]);
                    fabric.hasValidImage = true;
                    fabric.imageLink = fabric["Image Link"];
                } catch (e) {
                    fabric.hasValidImage = false;
                    console.warn('Invalid image URL for fabric:', fabric.Name);
                }
            } else {
                fabric.hasValidImage = false;
                console.warn('No image link provided for fabric:', fabric.Name);
            }
            
            return fabric;
        });
        
        // Filter out fabrics without valid image links
        const fabricsWithImages = fabrics.filter(fabric => fabric.hasValidImage);
        
        console.log('Fabrics with valid images:', fabricsWithImages.length, 'out of', fabrics.length);
        
        // Store all fabrics for filtering but only display those with images
        window.allFabricData = fabrics;
        displayFabrics(fabricsWithImages);
        setupFilters(fabricsWithImages);
    } catch (error) {
        console.error('Error fetching fabrics:', error);
        document.getElementById('fabricGrid').innerHTML = '<p>Error loading fabrics. Check console for details.</p>';
    }
}

// Display fabrics in grid
function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = ''; // Clear existing content

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No fabrics with images found.</p>';
        return;
    }

    fabrics.forEach(fabric => {
        // Skip fabrics without valid images
        if (!fabric.hasValidImage) return;
        
        // Create card
        const card = document.createElement('div');
        card.className = 'fabric-card';

        // Create image
        const img = document.createElement('img');
        img.src = fabric.imageLink;
        img.alt = fabric.Name || 'Fabric';
        
        // Handle image load errors
        img.onerror = function() {
            console.error('Image failed to load despite validation:', this.src);
            // Remove the card if the image fails to load
            card.remove();
        };

        // Create name element
        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name || 'Unnamed Fabric'}</strong>`;

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
            <h2>${fabric.Name || 'Unnamed Fabric'}</h2>
            <p><strong>SKU:</strong> ${fabric.SKU || 'N/A'}</p>
            <p><strong>Type:</strong> ${fabric.Type || 'N/A'}</p>
            <p><strong>Family:</strong> ${fabric.Family || 'N/A'}</p>
            <p><strong>Colour:</strong> ${fabric.Colour || 'N/A'}</p>
            <p><strong>Band Width:</strong> ${fabric["Band Width"] || 'N/A'}</p>
            <p><strong>Roll Width:</strong> ${fabric["Roll Width"] || 'N/A'}</p>
            <p><strong>Schedule:</strong> ${fabric.Schedule || 'N/A'}</p>
            <p><strong>Status:</strong> ${fabric.Status || 'N/A'}</p>
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
function setupFilters(fabricsWithImages) {
    const typeFilter = document.getElementById('typeFilter');
    const familyFilter = document.getElementById('familyFilter');
    const colourFilter = document.getElementById('colourFilter');
    const bandWidthFilter = document.getElementById('bandWidthFilter');
    const rollWidthFilter = document.getElementById('rollWidthFilter');
    const scheduleFilter = document.getElementById('scheduleFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Populate filter options dynamically with type safety - only using fabrics with images
    const types = [...new Set(fabricsWithImages.map(f => String(f.Type || '')))].filter(Boolean);
    const families = [...new Set(fabricsWithImages.map(f => String(f.Family || '')))].filter(Boolean);
    const colours = [...new Set(fabricsWithImages.map(f => String(f.Colour || '')))].filter(Boolean);
    const bandWidths = [...new Set(fabricsWithImages.map(f => String(f["Band Width"] || '')))].filter(Boolean);
    const schedules = [...new Set(fabricsWithImages.map(f => String(f.Schedule || '')))].filter(Boolean);
    const statuses = [...new Set(fabricsWithImages.map(f => String(f.Status || '')))].filter(Boolean);

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

        // Only filter fabrics that have valid images
        const filtered = fabricsWithImages.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            // Extract numeric part from Band Width (e.g., "3 Thick" -> "3")
            const bandWidthValue = fabric["Band Width"] ? String(fabric["Band Width"]).match(/^\d+/)?.[0] || '' : '';
            
            return (
                (!selectedType || fabric.Type === selectedType) &&
                (!selectedFamily || fabric.Family === selectedFamily) &&
                (!selectedColour || fabric.Colour === selectedColour) &&
                (!selectedBandWidth || bandWidthValue === selectedBandWidth) && // Compare numeric part only
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
