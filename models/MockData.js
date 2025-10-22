// MockData.js - Test data for development

export function getMockTasks() {
    return [
        {
            id: 1,
            title: 'Complete project proposal',
            description: 'Finish the Q4 project proposal document',
            category: 'Work',
            priority: 3,
            dueDate: '2025-10-20',
            dueTime: '14:00',
            completed: false,
            recurring: null,
            subTasks: [
                { title: 'Research competitors', completed: true },
                { title: 'Write executive summary', completed: false },
                { title: 'Create budget breakdown', completed: false }
            ]
        },
        {
            id: 2,
            title: 'Team meeting preparation',
            description: 'Prepare agenda and materials for weekly team sync',
            category: 'Work',
            priority: 2,
            dueDate: '2025-10-18',
            dueTime: '10:00',
            completed: false,
            recurring: {
                enabled: true,
                frequency: 'weekly',
                endDate: null
            },
            subTasks: []
        },
        {
            id: 3,
            title: 'Gym workout',
            description: 'Cardio and strength training',
            category: 'Personal',
            priority: 1,
            dueDate: '2025-10-17',
            dueTime: '18:00',
            completed: false,
            recurring: {
                enabled: true,
                frequency: 'daily',
                endDate: null
            },
            subTasks: []
        },
        {
            id: 4,
            title: 'Review pull requests',
            description: 'Review and approve pending PRs from team',
            category: 'Work',
            priority: 3,
            dueDate: '2025-10-17',
            dueTime: null,
            completed: true,
            recurring: null,
            subTasks: []
        },
        {
            id: 5,
            title: 'Buy groceries',
            description: 'Weekly grocery shopping',
            category: 'Personal',
            priority: 2,
            dueDate: '2025-10-19',
            dueTime: null,
            completed: false,
            recurring: {
                enabled: true,
                frequency: 'weekly',
                endDate: null
            },
            subTasks: [
                { title: 'Fruits and vegetables', completed: false },
                { title: 'Dairy products', completed: false },
                { title: 'Cleaning supplies', completed: false }
            ]
        }
    ];
}