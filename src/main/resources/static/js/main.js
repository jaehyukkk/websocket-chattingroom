$(document).ready(function(){
    // 방 목록 append
    const listHtml = (roomList) => {
        let listHtml = "";

        for(let i = roomList.length-1; i >= 0; i-- ) {
            listHtml += `
				<li data-room_number=${roomList[i].roomNumber}>
                    <span class="chat_title">${roomList[i].roomName }</span>
                    <span class="chat_count">${roomList[i].users.length}명</span>
	            </li>
                `;
        }

        $("main ul").html(listHtml);
    }


    // 방목록 불러오기
    const chattingRoomList = () => {
        $.ajax({
            url: "/api/chatting-room/list",
            type: "GET",
        }).then(function(result){
                listHtml(result)
            }).fail(function(){
                alert("에러가 발생했습니다");
            })
    }

    const socket = new SockJS('/websocket');
    const stomp = Stomp.over(socket);
    stomp.debug = null; //콘솔출력안함

    //아이디 저장용 array
    const subscribe = [];

    // stomp 구독 모두 취소
    const subscribeCancel = () => {
        const length = subscribe.length;
        for(let i = 0; i<length; i++) {
            const sid = subscribe.pop();
            stomp.unsubscribe(sid.id);
        }
    }


    // 메인 화면
    const main = () => {
        $("main").show();
        // 기존 구독 취소
        subscribeCancel();

        // 채팅 중이던 방이 있을때
        const room = chattingRoom();
        if(room) {
            return;
        }

        const subscribeId = stomp.subscribe("/topic/room-list", function(){
            // "/topic/room-list" 에서 메세지가 왔을때 실행할 함수
            chattingRoomList();
        });

        subscribe.push(subscribeId);
        chattingRoomList();
    };

    stomp.connect({}, function(){
        main();
    });

    const info = (function(){
        let nickname = "";
        let roomNumber = "";

        const getNickname = () => {
            return nickname;
        }

        const setNickname = (set) => {
            nickname = set;
        }

        const getRoomNumber = () => {
            return roomNumber;
        }

        const setRoomNumber = (set) => {
            roomNumber = set;
        }

        return {
            getNickname : getNickname,
            setNickname : setNickname,
            getRoomNumber : getRoomNumber,
            setRoomNumber : setRoomNumber,
        }
    })();

    const errorMSG = (result) => {

        if(result.status === 404) {
            alert("종료된 방입니다.");
        }

        location.href = "/";
    }


    // 참가자 html
    const userList = (users) => {
        $(".chat .chat_users .user").text(`${users.length} 명`);

        let userHtml = "";
        for(let i = 0; i < users.length; i++) {
            userHtml += `
			<li>${users[i] }</li>
            `;
        }

        $(".chat .chat_nickname ul").html(userHtml);
    }


    // 메세지 html
    const chatting = (messageInfo) => {
        let nickname = messageInfo.nickname;
        let message = messageInfo.message;

        message = message.replaceAll("\n", "<br>").replaceAll(" ", "&nbsp");
        const date = messageInfo.date;
        const d = new Date(date);

        const time = String(d.getHours()).padStart(2, "0")
            + ":"
            + String(d.getMinutes()).padStart(2, "0");

        let sender = "";

        if(info.getNickname() === nickname) {
            sender = "chat_me";
            nickname = "";
        } else {
            sender=  "chat_other";
        }

        const chatHtml = `
        <li>
            <div class=${sender }>
            	<div>
	            	<div class="nickname">${nickname }</div>
	            	<div class="message">
		                <span class=chat_in_time>${time }</span>
		                <span class="chat_content">${message }</span>
	                <span>
                </div>
            </div>
        </li>
        `;

        const chatUl = $(".chat ul");
        $(".chat ul.chat_list").append(chatHtml);
        chatUl.scrollTop(chatUl[0].scrollHeight);
    }


    // 채팅방 구독
    const chattingConnect = (roomNumber) => {
        // 기존 구독 취소
        subscribeCancel();

        // 메세지 받을 경로
        const id1 = stomp.subscribe("/topic/message/" + roomNumber, function(result){
            const message = JSON.parse(result.body);

            // 메세지가 왔을때 실행할 함수
            chatting(message);
        })

        // 입퇴장 알림 받을 경로
        const id2 = stomp.subscribe("/topic/notification/" + roomNumber, function(result){
            const room = JSON.parse(result.body);
            const message = room.message;

            // 메세지 왔을떄 실행할 함수
            userList(room.users);

            const chatHtml = `
	        <li>
	        	<div class="notification">
            		<span>${message}</span>
            	</div>
	        </li>
            `;

            $(".chat ul.chat_list").append(chatHtml);

            $(".chat ul").scrollTop($(".chat ul")[0].scrollHeight);

        })

        subscribe.push(id1);
        subscribe.push(id2);
    }

    // 채팅방 세팅
    const initRoom = (room, nickname) => {
        // 방 목록 업데이트
        stomp.send("/socket/roomList");
        $("main").hide();

        info.setNickname(nickname);
        info.setRoomNumber(room.roomNumber);

        $(".chat").show();
        $(".chat .chat_title").text(room.roomName);

        userList(room.users);
        chattingConnect(room.roomNumber);

        $(".chat_input_area textarea").focus();
    }

    // 메세지 보내기
    const sendMessage = function(){
        const message = $(".chat_input_area textarea");

        if (message.val() === "") {
            return;
        }

        const roomNumber = info.getRoomNumber();
        const nickname = info.getNickname();

        const data = {
            message : message.val(),
            nickname : nickname,
        }

        stomp.send("/socket/send-message/" + roomNumber, {}, JSON.stringify(data));
        message.val("");
    }

    $(".chat_button_area button").click(function() {
        sendMessage();
        $(".chat_input_area textarea").focus();
    })

    $(".chat_input_area textarea").keypress(function(event) {
        if (event.keyCode === 13) {
            if (!event.shiftKey) {
                event.preventDefault();

                sendMessage();
            }
        }
    })

    // 닉네임생성 후 채팅방 들어가기
    const enterChattingRoom = function(roomNumber) {

        swal({
            text: "닉네임을 입력해주세요.",
            content: "input",
            buttons: ["취소", "확인"],
            closeOnClickOutside : false
        })
            .then(function(nickname){
                if(nickname) {
                    const data = {
                        roomNumber : roomNumber,
                        nickname : nickname
                    }

                    $.ajax({
                        url: "/api/chatting-room/enter",
                        type: "GET",
                        data: data,
                    }).then(function(room){
                            initRoom(room, nickname);

                            room.message = nickname + "님이 참가하셨습니다";
                            stomp.send(
                                "/socket/notification/" + roomNumber, {},
                                JSON.stringify(room));

                        }).fail(function(result){
                            errorMSG(result);
                        })
                }
            })
    }

// 새 채팅방 만들기
    const createRoom = (roomName) => {
        swal({
            text: "닉네임을 입력해주세요",
            content: "input",
            buttons: ["취소", "확인"],
            closeOnClickOutside : false
        }).then(function(nickname){
                if(nickname) {

                    const data = {
                        roomName : roomName,
                        nickname : nickname
                    }

                    $.ajax({
                        url: "/api/chatting-room",
                        type: "POST",
                        data: data,
                    }).then(function(room){
                            initRoom(room, nickname)
                        }).fail(function(){
                            alert("에러가 발생했습니다");
                        })
                }
            })
    }

    $(".new_chat").click(function(){
        swal({
            text: "방 이름을 입력해주세요",
            content: "input",
            buttons: ["취소","확인"],
            closeOnClickOutside : false
        }).then(function(roomName){
                if(roomName) {
                    createRoom(roomName);
                }
            })
    })

    $(document).on("dblclick", "main li", function(){
        const roomNumber = $(this).data("room_number");
        enterChattingRoom(roomNumber);
    })

    // 채팅방 나가기
    $(".chat_back").click(function() {
        swal({
            text: "대화방에서 나갈까요?",
            buttons: ["취소", "확인"]
        }).then(function(result){
                if(result) {
                    $.ajax({
                        url: "/api/chatting-room/exit",
                        type: "PATCH",
                    }).then(function(room){
                            const roomNumber = info.getRoomNumber();

                            if(room.users.length !== 0) {
                                // 채팅방 나가기 메세지
                                room.message = info.getNickname() + "님이 퇴장하셨습니다";
                                stomp.send(
                                    "/socket/notification/" + roomNumber, {},
                                    JSON.stringify(room));
                            }

                            // 채팅방 목록 업데이트
                            stomp.send("/socket/room-list");

                            main();
                            $(".chat").hide();
                            $(".chat ul.chat_list").html("");

                            info.setRoomNumber("");
                            info.setNickname("");
                        })
                        .fail(function(){
                            errorMSG();
                        })
                }
            })
    })

    // 대화 중이던 방
    const chattingRoom = () => {
        let returnRoom = null;

        $.ajax({
            url: "/api/chatting-room",
            type: "GET",
            async: false,
        }).then(function(result){
                if(result !== "") {
                    const room = result.chattingRoom;
                    const nickname = result.myNickname;
                    initRoom(room, nickname);
                    returnRoom = result;
                }
            }).fail(function(result){
                errorMSG(result);
            })

        return returnRoom;
    };

})
