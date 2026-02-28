import React from 'react';
import { Navigate } from 'react-router-dom';

// 此路由已被 /teacher/assignments/list（AssignmentsListPage）取代
// 直接重定向，避免用户看到假数据页面
const TeacherAssignmentsPage: React.FC = () => {
  return <Navigate to="/teacher/assignments/list" replace />;
};

export default TeacherAssignmentsPage;
