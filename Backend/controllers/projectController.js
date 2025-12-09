//create project

import prisma from "../configs/prisma.js";
// Create project
export const createProject = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority } = req.body;

        // check if workspace exists and include members
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { include: { user: true } } }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // check permissions (ADMIN required)
        if (!workspace.members.some(member => member.userId === userId && member.role === "ADMIN")) {
            return res.status(403).json({ message: "You don't have permission to create projects in this workspace" });
        }

        // resolve team lead (team_lead may be email or id)
        const teamLead = await prisma.user.findUnique({
            where: {email: team_lead},
            select: {id: true}
        })

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLeadId,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        });

        // Add members to project if they are in the workspace and provided as emails or ids
        if (team_members?.length > 0) {
            const memberstoAdd = []
            workspace.members.forEach(member => {
                if(team_members.includes(member.user.email)){
                    memberstoAdd.push(member.user.id)
                }
            })
            await prisma.projectMember.createMany({
                data: memberstoAdd.map(memberId => ({
                    projectId: project.id,
                    userId: memberId
                }))
            })
        }
        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id},
            include: {
                members: {include: {user: true}},
                tasks: {include: {assignee: true, comments: {include: {user: true}}}},
                owner: true
            }
        })
        res.json({project: projectWithMembers, message: "Project created successfully"})

        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};

// Update project
export const updateProject = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority } = req.body;


        // check permission: ADMIN of workspace or project team lead
        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if(!workspace){
            res.status(404).json({message: "Workspace not found"})
        }

        if(!workspace.members.some((member)=>member.userId === userId && member.role === "ADMIN")){
            const project = await prisma.project.findUnique({
                where: {id}
            })
            if(!project){
                return res.status(404).json({message: "Project not found"})
            } else if(project.team_leadd !== userId){
                return res.status(403).json({message: "You don't have permission to update projects in this workspace"})

            }
        }

        const project = await prisma.project.update({
            where: {id},
            data:{
                workspace,
                description,
                name,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        

    }catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message})
    }
}
        

// Add member to project
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId } = req.params;
        const { email, userId: newUserId } = req.body; // accept email or id

        if (!projectId) return res.status(400).json({ message: 'Project id is required in params' });

        const project = await prisma.project.findUnique({ where: { id: projectId }, include: { workspace: { include: { members: { include: { user: true } } } }, members: true } });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const workspace = project.workspace;
        if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

        const isAdmin = workspace.members.some(m => m.userId === userId && m.role === 'ADMIN');
        if (!isAdmin && project.team_lead !== userId) {
            return res.status(403).json({ message: 'You do not have permission to add members to this project' });
        }

        // find member in workspace
        const found = workspace.members.find(m => m.user.email === email || m.user.id === newUserId || m.user.id === email);
        if (!found) return res.status(404).json({ message: 'User is not a member of the workspace' });

        // create project member if not exists
        await prisma.projectMember.createMany({ data: [{ projectId: project.id, userId: found.user.id }], skipDuplicates: true });

        const projectWithMembers = await prisma.project.findUnique({ where: { id: project.id }, include: { members: { include: { user: true } } } });

        res.json({ project: projectWithMembers, message: 'Member added to project' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};