import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({event}) => {
        const {data} = event
        await prisma.user.create({
            data: {
                id: data.id,
                email: data.email.addresses[0]?.email_addres,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        })
    }
)

const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk'},
    {event: 'clerk/user.deleted'},
    async ({event}) => {
        const {data} = event
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        })
    }
)

const syncUserUpdation = inngest.createFunction(
    {id: 'Update-user-from-clerk'},
    {event: 'clerk/user.updated'},
    async ({event}) => {
        const {data} = event
        await prisma.user.update({
            where: {
                
                id: data.id
            },
            data: {
                email: data.email.addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        })
    }
)


const syncWorkspaceCreation = inngest.createFunction(
    {id: 'synce-workspace-from-clerk'},
    {event: 'clerk/organization.created'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspace.create({
        data: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            ownerId: data.created.by,
            image_url: data.image_url,
        }
        })
        // Add creator as ADMIN member
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        })
    }
)
// Inngest Function To Update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
    {id: 'update-workspace-from-clerk'},
    {event: 'clerk/organization.updated'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspace.update({
        where: {
            id: data.id
        },
        data: {
            name: data.name,
            slug: data.slug,
            image_url: data.image_url,
        }

    })
}
)

//Inngest Function to delete workspace from database

const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-with-clerk'},
    {event: 'clerk/organization.deleted'},

    async ({event}) => {
        const {data} = event;
        await prisma.workspace.delete({
            where: {
                id: data.id
            }
        })
    }

)

//Inngest Function to save workspace member data to a database

const syncWorkspaceMemberCreation = inngest.createFunction(
    {id: 'sync-workspace-member-from-clerk'},
    {event: 'clerk/organizationInvitation.accepted'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role_name).toUpperCase(),
            }
        })
    }
)
//INNGEST functions to send email on task creation
const sendTaskAssigneeEmail = inngest.createFunction(
    {id: "send-task-assignee-email"},
    {event: "app/task.assigned"},
    async ({event, step}) => {
        const {taskId, origin} = event.data;

        const task = await prisma.task.findUnique({
            where: {id: taskId},
            include: {assignee: true, project: true}
        })
        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assigned: ${task.project.name} `,
            body: `Hi ${task.assignee.name}` `${task.title}`
            `${new Date(task.due_date).toLocaleDateString()}
            <a> View Task </a>`
        })
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation,syncUserDeletion,syncUserUpdation,syncWorkspaceCreation,syncWorkspaceUpdation,syncWorkspaceDeletion,syncWorkspaceMemberCreation];