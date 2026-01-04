import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import ProfilePage from '../ProfilePage'
import { createTestStore, renderWithProviders, mockAuthState } from '../../test/utils'

describe('ProfilePage', () => {
  it('renders current user info without triggering a fetch loop', async () => {
    const store = createTestStore({ auth: mockAuthState })
    const dispatchSpy = vi.spyOn(store, 'dispatch')

    renderWithProviders(<ProfilePage />, { store })

    // Username should be visible
    expect(screen.getByDisplayValue(mockAuthState.user.username)).toBeInTheDocument()

    // Give effects a tick; ProfilePage should not dispatch getCurrentUserAsync on mount.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(dispatchSpy).not.toHaveBeenCalled()

    dispatchSpy.mockRestore()
  })
})


