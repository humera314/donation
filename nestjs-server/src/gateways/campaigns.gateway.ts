import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, specify your frontend URL
  },
})
export class CampaignsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private campaignViewers = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove from all campaign rooms
    this.campaignViewers.forEach((viewers, campaignId) => {
      viewers.delete(client.id);
      this.broadcastViewerCount(campaignId);
      if (viewers.size === 0) {
        this.campaignViewers.delete(campaignId);
      }
    });
  }

  @SubscribeMessage('join_campaign')
  handleJoinCampaign(
    @MessageBody() campaignId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Join the campaign room
    client.join(`campaign:${campaignId}`);
    
    // Track viewers
    if (!this.campaignViewers.has(campaignId)) {
      this.campaignViewers.set(campaignId, new Set());
    }
    this.campaignViewers.get(campaignId)!.add(client.id);
    
    // Broadcast updated viewer count
    this.broadcastViewerCount(campaignId);
    
    console.log(`Client ${client.id} joined campaign ${campaignId}`);
  }

  @SubscribeMessage('leave_campaign')
  handleLeaveCampaign(
    @MessageBody() campaignId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`campaign:${campaignId}`);
    
    const viewers = this.campaignViewers.get(campaignId);
    if (viewers) {
      viewers.delete(client.id);
      this.broadcastViewerCount(campaignId);
    }
  }

  // Called by DonationsService when new donation is created
  broadcastNewDonation(campaignId: string, donation: any) {
    this.server.to(`campaign:${campaignId}`).emit('new_donation', {
      amount: donation.amount,
      donorName: donation.isAnonymous ? 'Anonymous' : donation.donorName,
      message: donation.message,
      timestamp: new Date(),
    });
  }

  // Called by DonationsService after updating campaign
  broadcastProgressUpdate(campaignId: string, campaign: any) {
    this.server.to(`campaign:${campaignId}`).emit('progress_update', {
      currentAmount: campaign.currentAmount,
      goalAmount: campaign.goalAmount,
      percentage: (Number(campaign.currentAmount) / Number(campaign.goalAmount)) * 100,
      status: campaign.status,
    });
  }

  private broadcastViewerCount(campaignId: string) {
    const count = this.campaignViewers.get(campaignId)?.size || 0;
    this.server.to(`campaign:${campaignId}`).emit('viewer_count', { count });
  }
}