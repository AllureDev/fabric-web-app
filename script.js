// Update convertDropboxLink function to handle empty links better
function convertDropboxLink(link) {
    if (!link || link.trim() === '') {
        console.log('No image link provided, skipping image');
        return ''; // Return empty string for no image
    }
    if (link.includes('dropbox.com')) {
        const directLink = link.replace('?dl=0', '?raw=1').replace('?dl=1', '?raw=1');
        console.log('Converted Dropbox link:', directLink);
        return directLink;
    }
    console.log('Using provided link as-is:', link);
    return link;
}

// Update displayFabrics to skip image if no link
function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = ''; // Clear existing content

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No fabrics found.</p>';
        return;
    }

    fabrics.forEach(fabric => {
        const card = document.createElement('div');
        card.className = 'fabric-card';

        // Only create and add image if there’s a valid link
        if (fabric.imageLink) {
            const img = document.createElement('img');
            img.src = fabric.imageLink;
            img.alt = fabric.Name;
            img.onerror = () => {
                console.error('Image failed to load:', fabric.imageLink);
                img.remove(); // Remove broken image instead of showing placeholder
            };
            img.onload = () => console.log('Image loaded successfully:', fabric.imageLink);
            card.appendChild(img);
        }

        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name}</strong>`;

        card.appendChild(nameP);
        card.addEventListener('click', () => showFabricDetails(fabric));
        grid.appendChild(card);
    });
}

// Update showFabricDetails to skip image if no link
function showFabricDetails(fabric) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Only include image HTML if there’s a link
    const imageHtml = fabric.imageLink 
        ? `<img src="${fabric.imageLink}" alt="${fabric.Name}" style="max-width:100%;">`
        : '';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            ${imageHtml}
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

    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Update setupFilters function
function setupFilters(allFabrics) {
    const typeFilter = document.getElementById('typeFilter');
    const familyFilter = document.getElementById('familyFilter');
    const colourFilter = document.getElementById('colourFilter');
    const bandWidthFilter = document.getElementById('bandWidthFilter');
    const rollWidthFilter = document.getElementById('rollWidthFilter');
    const scheduleFilter = document.getElementById('scheduleFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Parse band width to numbers, ignoring non-numeric parts
    const bandWidths = [...new Set(allFabrics.map(f => {
        const match = f["Band Width"].match(/^\d+(\.\d+)?/);
        return match ? match[0] : '';
    }).filter(Boolean))];

    const types = [...new Set(allFabrics.map(f => f.Type))];
    const families = [...new Set(allFabrics.map(f => f.Family))];
    const colours = [...new Set(allFabrics.map(f => f.Colour))];
    const schedules = [...new Set(allFabrics.map(f => f.Schedule))];
    const statuses = [...new Set(allFabrics.map(f => f.Status))];

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
            const bandWidthNum = parseFloat(fabric["Band Width"].match(/^\d+(\.\d+)?/)?.[0]) || 0;

            return (
                (!selectedType || fabric.Type === selectedType) &&
                (!selectedFamily || fabric.Family === selectedFamily) &&
                (!selectedColour || fabric.Colour === selectedColour) &&
                (!selectedBandWidth || bandWidthNum.toString() === selectedBandWidth) &&
                (rollWidthValue === 0 || rollWidthNum >= rollWidthValue) && // Changed > to >=
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
