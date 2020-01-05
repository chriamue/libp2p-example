'use strict'
const fs = require('fs');
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')
const Node = require('./node')


async function createNode(peerId = null) {
    let peerInfo = new PeerInfo(peerId);
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    let node = new Node({
        peerInfo
    })
    node.on('peer:discovery', (peer) => {
        console.log('Discovered:', peer.id.toB58String())
        // Note how we need to dial, even if just to warm up the Connection (by not
        // picking any protocol) in order to get a full Connection. The Peer Discovery
        // doesn't make any decisions for you.
        node.dial(peer, () => { })


    })
    node.on('peer:connect', (peer) => {
        console.log('Connection established to:', peer.id.toB58String())
        node.dialProtocol(peer, '/a-protocol', (err, conn) => {
            if (err) {
                console.log(err)
                return;
            };
            console.log('sending');
            pull(pull.values(['This information is sent out encrypted to the other peer']), conn)
        })
    })
    return node;
}

fs.readFile('peer.pub', async (err, data) => {
    if (err) throw err;
    console.log(data)
    let peerId2 = await PeerId.createFromPubKey(data);

    let peerId1 = await PeerId.create()
    console.log(peerId2)
    let node2 = await createNode(peerId2)
    let node1 = await createNode(peerId1)
    await node1.start()
    await node1.dial(node2.peerInfo, () => { })
    node1.dialProtocol(node2.peerInfo, '/a-protocol', (err, conn) => {
        //if (err) { throw err }
        pull(pull.values(['This information is sent out encrypted to the other peer']), conn)
    })
});

