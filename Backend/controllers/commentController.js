// Add comment

import prisma from "../configs/prisma";

export const addComment = async (req,res) => {
    try {
        const {userId} = await req.auth();
        const {comment, taskId} = req.body;

        //check if user is projectmember
        const task = await prisma.task.findUnique({
            where: {id: taskId},

        })
        const project = await prisma.project.findUnique({
            where:
            {id: task.projectId},
        })
        const project = await prisma.project.findUnique({
            where: {id: task.projectId},
            include: {members: {include: {user: true}}}
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});

        
    }
        
    }
