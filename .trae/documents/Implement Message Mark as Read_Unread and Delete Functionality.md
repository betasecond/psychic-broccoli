## Implementation Plan

### 1. Update State Management
- Add React state to manage messages dynamically
- Replace static mock data with state variable

### 2. Implement Mark as Read/Unread Function
- Create `handleMarkAsRead` function that toggles message status
- Update message state when button is clicked
- Reflect changes in UI (update button text and badge display)

### 3. Implement Delete Function
- Create `handleDelete` function that removes message from state
- Update message state when delete button is clicked

### 4. Update Message Count Cards
- Calculate total messages dynamically from state
- Calculate unread messages count dynamically
- Update the count displays on the dashboard cards

### 5. Enhance User Experience
- Add success messages for actions using Ant Design's message component
- Ensure proper key management for list items
- Maintain consistent UI styling

### Files to Modify
- `e:\code\psychic-broccoli\frontend\src\pages\student\MessagesPage.tsx`

### Key Changes
- Convert messages from static array to React state
- Add event handlers for mark as read/unread and delete actions
- Update UI to reflect dynamic changes
- Add success notifications

This implementation will provide the requested functionality while maintaining the existing UI design and user experience.