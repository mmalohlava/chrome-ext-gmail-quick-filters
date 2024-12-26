import { getYesterdayDate } from './utils';
import { getTodayDate } from './utils';

const TODAY_BUTTON_COLOR = '#fffde7';     // Light yellow color
const YESTERDAY_BUTTON_COLOR = '#ffcdd2';  // Light pink for contrast

const addFilterButtons = () => {
    const targetNode = document.querySelector('form[role="search"]')?.parentNode as HTMLDivElement; 

    if (!targetNode) return;

    // Create container div for buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'inline-flex';
    buttonGroup.style.gap = '4px';
    buttonGroup.style.marginLeft = '8px';
    buttonGroup.style.verticalAlign = 'middle';

    // Check if buttons already exist
    if (document.querySelector('#todayFilterButton') || document.querySelector('#yesterdayFilterButton')) return;

    // Create today and yesterday filter buttons
    const todayFilterButton = createFilterButton('todayFilterButton', 'T', 'Today\'s Emails', TODAY_BUTTON_COLOR, `newer_than:1d`);
    const yesterdayFilterButton = createFilterButton('yesterdayFilterButton', 'Y', 'Yesterday\'s Emails',YESTERDAY_BUTTON_COLOR, `newer_than:2d older_than:1d`);
    buttonGroup.appendChild(todayFilterButton);
    buttonGroup.appendChild(yesterdayFilterButton);

    // Insert buttons after the search bar
    targetNode.insertAdjacentElement('afterend', buttonGroup);
}

const createFilterButton = (id: string, label: string, tooltip: string, buttonColor: string, searchQuery: string) => {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'zo';
    button.textContent = label;
    button.dataset.tooltip = tooltip;
    button.style.backgroundColor = buttonColor; // Default Gmail button color
    button.style.border = '1px solid #dadce0';
    button.style.borderRadius = '6px';
    button.style.padding = '4px 8px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', () => {
        const searchBar = document.querySelector('input[name="q"]') as HTMLInputElement;

        if (searchBar) {
            searchBar.value = searchQuery;
            const searchButton = document.querySelector('button[aria-label="Search mail"]') as HTMLButtonElement;
            searchButton?.click();
        }
    });
    return button;
}


const highlightDates = (emailListContainer: HTMLElement) => {
    const emailRows = emailListContainer.querySelectorAll('table[id=":1dn"] span[title*="Dec 24"]'); // Locate email rows

    emailRows.forEach((row) => {
        const dateElement = row.parentElement as HTMLElement;
        const dateText = row.textContent || '';

        // Highlight based on the date
        if (dateText.includes("PM") || dateText.includes("AM")) {
            dateElement.style.backgroundColor = TODAY_BUTTON_COLOR;
        } else {
            dateElement.style.backgroundColor = YESTERDAY_BUTTON_COLOR; 
        }
    });
};

// Color dates in the email list
const highlightEmailDates = () => {
    // Locate the email list container
    const emailListContainer = (document.querySelector('div[role="main"]') || document.body) as HTMLElement;

    if (!emailListContainer) return;

    // Function to highlight dates
    // Create a MutationObserver to watch for changes in the email list
    const todayDate = getTodayDate();
    const getYesterdayDate = getYesterdayDate();

    const observer = new MutationObserver(() => {
        highlightDates(emailListContainer);
    });

    // Observe the email list container for child changes
    observer.observe(emailListContainer, { childList: true, subtree: true });

    // Initial highlight
    highlightDates(emailListContainer);
};

//
// Register event observers
//

// Call the function to start observing
highlightEmailDates();

// Observe changes in the DOM to ensure Gmail UI is loaded
const observer = new MutationObserver(() => {
    addFilterButtons();
});
// Start observing the body for Gmail UI changes
observer.observe(document.body, { childList: true, subtree: true });