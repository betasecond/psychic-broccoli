import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store'
import { getCurrentUserAsync } from '../store/slices/authSlice'
import { Spin } from 'antd'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  allowedRoles?: ('STUDENT' | 'INSTRUCTOR' | 'ADMIN')[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
}) => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { user, token, isAuthenticated, loading } = useAppSelector(
    state => state.auth
  )

  useEffect(() => {
    // If we have a token but no user info, try to get current user
    if (token && !user && !loading) {
      dispatch(getCurrentUserAsync())
    }
  }, [dispatch, token, user, loading])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If token exists but user info failed to load, redirect to login
  if (token && !user && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access control
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = getRoleBasedRedirectPath(user.role)
    return <Navigate to={redirectPath} replace />
  }

  // Check if user role is in allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = getRoleBasedRedirectPath(user.role)
    return <Navigate to={redirectPath} replace />
  }

  // User is authenticated and has proper permissions
  return <>{children}</>
}

/**
 * Get redirect path based on user role
 */
const getRoleBasedRedirectPath = (role: string): string => {
  switch (role) {
    case 'STUDENT':
      return '/student/dashboard'
    case 'INSTRUCTOR':
      return '/teacher/dashboard'
    case 'ADMIN':
      return '/admin/dashboard'
    default:
      return '/login'
  }
}

export default ProtectedRoute