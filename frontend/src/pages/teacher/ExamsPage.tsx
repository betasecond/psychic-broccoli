import React from 'react';
import { Navigate } from 'react-router-dom';

// 此路由已被 /teacher/exams/list（ExamsListPage）取代
// 直接重定向，避免用户看到假数据页面
const TeacherExamsPage: React.FC = () => {
  return <Navigate to="/teacher/exams/list" replace />;
};

export default TeacherExamsPage;