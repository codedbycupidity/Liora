export const GESTURES = {
    I_LOVE_YOU: 'I Love You',
    HELLO: 'Hello',
    GOOD: 'Good',
    BAD: 'Bad',
    YES: 'Yes',
    I_ME: 'I/I\'m',
    NO: 'No',
    OKAY: 'Okay',
    NONE: 'None'
};

export function detectGesture(landmarks) {
    if (isILoveYouGesture(landmarks)) return GESTURES.I_LOVE_YOU;
    if (isHelloGesture(landmarks)) return GESTURES.HELLO;
    if (isGoodGesture(landmarks)) return GESTURES.GOOD;
    if (isBadGesture(landmarks)) return GESTURES.BAD;
    if (isYesGesture(landmarks)) return GESTURES.YES;
    if (isIGesture(landmarks)) return GESTURES.I_ME;
    if (isNoGesture(landmarks)) return GESTURES.NO;
    if (isOkayGesture(landmarks)) return GESTURES.OKAY;
    return GESTURES.NONE;
}

function isILoveYouGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const thumbExtended = thumbTip.y < thumbIP.y || Math.abs(thumbTip.x - thumbIP.x) > 0.1;
    const indexExtended = indexTip.y < indexPIP.y;
    const middleFolded = middleTip.y > middlePIP.y;
    const ringFolded = ringTip.y > ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    return thumbExtended && indexExtended && middleFolded && ringFolded && pinkyExtended;
}

function isHelloGesture(landmarks) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    const palmFacingForward = landmarks[9].z < wrist.z;
    
    return indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacingForward;
}

function isGoodGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbUp = thumbTip.y < thumbIP.y && thumbTip.y < thumbMCP.y;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbUp && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isBadGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbDown = thumbTip.y > thumbIP.y && thumbTip.y > thumbMCP.y;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbDown && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isYesGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const thumbFolded = Math.abs(thumbTip.y - thumbMCP.y) < 0.1;
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    return thumbFolded && indexFolded && middleFolded && ringFolded && pinkyFolded;
}

function isIGesture(landmarks) {
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    const indexPointingUp = Math.abs(indexTip.x - indexPIP.x) < 0.05;
    
    return indexExtended && middleFolded && ringFolded && pinkyFolded && indexPointingUp;
}


function isNoGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    const fingersClose = Math.abs(indexTip.x - middleTip.x) < 0.05;
    const touchingThumb = Math.abs(indexTip.x - thumbTip.x) < 0.1 && Math.abs(indexTip.y - thumbTip.y) < 0.1;
    
    return indexExtended && middleExtended && ringFolded && pinkyFolded && (fingersClose || touchingThumb);
}

function isOkayGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    const thumbIndexTouching = thumbIndexDistance < 0.05;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    return thumbIndexTouching && middleExtended && ringExtended && pinkyExtended;
}