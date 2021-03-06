import React from 'react';
import Message from '@/components/Message';
import Heading from '@/components/Heading';
import io from 'socket.io-client';
import ChatInput from '@/components/ChatInput';
import Notice from '@/components/Notice';

import {getMsgList} from '@/api';
import { getCookie } from 'utils';
import './index.scss';


export default class Chat extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            msgList: [],
            ownUserName: decodeURI(getCookie('username')),
            chatName: '摸鱼俱乐部',
            socket: null,
            memberCount: 0,
        }
        this.messageWrap = React.createRef();
        this.chatWrap = React.createRef();
    }
    
    async componentDidMount(){
        try {
            const {chatName} = this.state;
            const res = await getMsgList({chatName});
            if(res.status === 1){
                const {msgList, chatName} = res.data;
                this.setState({
                    msgList,
                    chatName,
                    socket: io('wss://liwuhou.cn')
                }, () => {
                    const {ownUserName: username, chatName} = this.state;
                    // 建立ws连接
                    const {socket} = this.state;
                    socket.on('connect', function(){
                        // 初始化
                        socket.emit('init', username);
                    })
                    // 系统通知
                    .on('notice', (data) => {
                        const {memberCount, message} = data;
                        this.appendChatList(message);
                        this.setState({memberCount});
                    })
                    // 接收信息
                    .on('news', this.appendChatList)
                        
                    // 滚动条定位到最新的聊天信息
                    this.sliderDownNews();
                })
            }
        } catch (error) {
            console.error(error);
        }
        
    }
    // 渲染消息列表
    renderMessageList = (list, ownUserName) => {
        return list.map(({_id, time, username, content, event}, idx) => {
            if(event === 'notice'){
                return (
                    <Notice
                        key={_id}
                        content={content}
                    />
                )
            }else{
                return (
                    <Message
                        key={_id}
                        time={time}
                        content={content}
                        username={username}
                        isShowTime={idx % 4 === 0}
                        isSelf={username === ownUserName}
                    />
                )
            }
        })
    }
    // 更新msgList的回调
    appendChatList = (message) => {
        this.setState((preState) => ({
            msgList: [
                ...preState.msgList,
                message
            ]
        }), () => {
            this.sliderDownNews();
        })
    }
    // 发送信息
    sendMsgMethod = (content) => {
        const {chatName, ownUserName: username} = this.state;
        this.state.socket.emit('chat', {content, chatName, username});
    }
    // 滑动到最新消息处
    sliderDownNews = () => {
        this.chatWrap.current.scrollTop = this.messageWrap.current.offsetHeight;
    }
    
    render(){
        const {ownUserName, chatName, msgList, memberCount} = this.state;
        return (
            <div className="chat">
                <Heading heading={chatName} count={memberCount}/>
                <div className="chat__content" ref={this.chatWrap}>
                    <ul ref={this.messageWrap}>
                        {this.renderMessageList(msgList, ownUserName)}
                    </ul>
                </div>
                <ChatInput
                    onsendMsg={this.sendMsgMethod}
                />
            </div>
        )
    }
}
