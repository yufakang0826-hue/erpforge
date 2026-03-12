# Detail Page Template

A detail/edit page with tab layout, form validation, and CRUD actions.

## How to Use

1. **Copy** this directory to `src/pages/{your-module}/`

2. **Replace placeholders**:
   - `{{Module}}` → PascalCase name
   - `{{module}}` → camelCase name

3. **Customize the form** (`page.tsx`):
   - Add/remove form fields
   - Add more tabs for related data
   - Connect to your actual data hooks

4. **Customize validation** (`form-schema.ts`):
   - Update Zod schema to match your domain model
   - Add custom validation rules

5. **Register route**:
   ```tsx
   <Route path="/{{module}}s/:id" element={<{{Module}}DetailPage />} />
   <Route path="/{{module}}s/new" element={<{{Module}}DetailPage />} />
   ```

## Features

- **Tab layout**: Organize related content into tabs
- **Form validation**: Zod schema with React Hook Form
- **Create/Edit mode**: Detects `id === 'new'` for create mode
- **Save/Cancel/Delete**: Standard CRUD actions
- **Loading skeleton**: Shown while data is loading
- **Back navigation**: Arrow button returns to list page
